import { Match } from "../models/match.model.js";
import { Tournament } from "../models/tournament.model.js";

const activeGames = new Map();

export default function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("findOrCreateMatch", async ({ userId, tournamentId }) => {
            socket.userId = userId;

            let match = await Match.findOne({
                tournament: tournamentId,
                player2: null,
            });

            if (match) {
                // Join as second player
                match.player2 = userId;
                await match.save();
                socket.matchId = match._id.toString();
                socket.join(socket.matchId);

                // Notify both players match is ready
                io.to(socket.matchId).emit("matchReady", {
                    matchId: socket.matchId,
                    player1: match.player1,
                    player2: match.player2,
                });

                console.log(`User ${userId} joined existing match ${socket.matchId}`);
            } else {
                // Create new match as player1
                match = await Match.create({
                    tournament: tournamentId,
                    player1: userId,
                    player2: null,
                });

                socket.matchId = match._id.toString();
                socket.join(socket.matchId);

                socket.emit("waitingForOpponent", {
                    matchId: socket.matchId,
                    message: "Waiting for an opponent...",
                });

                console.log(`User ${userId} created and joined new match ${socket.matchId}`);
            }
        });

        socket.on("makeMove", async ({ matchId, userId, move }) => {
            if (!["rock", "paper", "scissors"].includes(move)) return;

            const matchKey = `match-${matchId}`;
            if (!activeGames.has(matchKey)) {
                activeGames.set(matchKey, { round: 1, rounds: {}, scores: {} });
            }

            const game = activeGames.get(matchKey);
            const roundKey = `round${game.round}`;
            if (!game.rounds[roundKey]) game.rounds[roundKey] = {};

            game.rounds[roundKey][userId] = move;

            if (Object.keys(game.rounds[roundKey]).length === 2) {
                const [p1, p2] = Object.keys(game.rounds[roundKey]);
                const move1 = game.rounds[roundKey][p1];
                const move2 = game.rounds[roundKey][p2];

                let result = "draw";
                let winnerId = null;

                if (
                    (move1 === "rock" && move2 === "scissors") ||
                    (move1 === "scissors" && move2 === "paper") ||
                    (move1 === "paper" && move2 === "rock")
                ) {
                    winnerId = p1;
                    result = "player1";
                } else if (move1 !== move2) {
                    winnerId = p2;
                    result = "player2";
                }

                if (winnerId) {
                    game.scores[winnerId] = (game.scores[winnerId] || 0) + 1;
                }

                io.to(matchId).emit("roundResult", {
                    round: game.round,
                    moves: game.rounds[roundKey],
                    result,
                    winner: winnerId,
                    scores: game.scores,
                });

                if (game.round === 3) {
                    const finalWinnerId =
                        (game.scores[p1] || 0) > (game.scores[p2] || 0)
                            ? p1
                            : (game.scores[p2] || 0) > (game.scores[p1] || 0)
                              ? p2
                              : null;

                    const finalResult =
                        finalWinnerId === p1
                            ? "player1"
                            : finalWinnerId === p2
                              ? "player2"
                              : "draw";

                    const match = await Match.findById(matchId);
                    match.result = finalResult;
                    match.winner = finalWinnerId;
                    await match.save();

                    // Update leaderboard
                    if (finalWinnerId) {
                        const tournament = await Tournament.findById(match.tournament);
                        const participant = tournament.participants.find(
                            (p) => p.user.toString() === finalWinnerId
                        );
                        if (participant) {
                            participant.wins += 1;
                            await tournament.save();
                        }
                    }

                    io.to(matchId).emit("matchOver", {
                        result: finalResult,
                        winner: finalWinnerId,
                        scores: game.scores,
                    });

                    activeGames.delete(matchKey);
                } else {
                    game.round += 1;
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
}
