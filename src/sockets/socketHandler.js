import { Match } from "../models/match.model.js";
import { Tournament } from "../models/tournament.model.js";

const activeGames = new Map();

export default function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("findOrCreateMatch", async ({ userId, tournamentId }) => {
            socket.userId = userId;
            console.log("Player trying to connect:", userId);

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

                // Save socket IDs for both players
                const existingGame = activeGames.get(socket.matchId);
                if (existingGame) {
                    existingGame.player2SocketId = socket.id;
                }

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

                activeGames.set(socket.matchId, {
                    player1: userId,
                    player2: null,
                    player1SocketId: socket.id,
                    player2SocketId: null,
                    moves: {},
                    scores: {},
                });

                socket.emit("waitingForOpponent", {
                    matchId: socket.matchId,
                    message: "Waiting for an opponent...",
                });

                console.log(`User ${userId} created and joined new match ${socket.matchId}`);
            }
        });

        socket.on("joinMatchRoom", ({ matchId }) => {
            socket.matchId = matchId;
            socket.join(matchId);

            const game = activeGames.get(matchId);
            if (game) {
                if (game.player1 === socket.userId) game.player1SocketId = socket.id;
                else if (game.player2 === socket.userId) game.player2SocketId = socket.id;
            }
        });

        socket.on("makeMove", async ({ matchId, userId, move }) => {
            const game = activeGames.get(matchId);
            if (!game) return;

            game.moves[userId] = move;

            const opponentId = userId === game.player1 ? game.player2 : game.player1;

            const opponentSocketId =
                userId === game.player1 ? game.player2SocketId : game.player1SocketId;

            // Tell this player to wait
            socket.emit("waitingForOpponentChoice");

            // If opponent has already played
            if (opponentId && game.moves[opponentId]) {
                const playerMove = game.moves[userId];
                const opponentMove = game.moves[opponentId];

                // Determine winner
                const winnerId = getWinner(userId, opponentId, playerMove, opponentMove);

                // Update scores
                game.scores[userId] = (game.scores[userId] || 0) + (winnerId === userId ? 1 : 0);
                game.scores[opponentId] =
                    (game.scores[opponentId] || 0) + (winnerId === opponentId ? 1 : 0);

                // Send individual results
                const playerSocket = io.sockets.sockets.get(
                    game.player1 === userId ? game.player1SocketId : game.player2SocketId
                );
                const opponentSocket = io.sockets.sockets.get(opponentSocketId);

                // Send round result to each player
                playerSocket?.emit("roundResult", {
                    winnerId,
                    playerChoice: playerMove,
                    opponentChoice: opponentMove,
                    scores: game.scores,
                });

                opponentSocket?.emit("roundResult", {
                    winnerId,
                    playerChoice: opponentMove,
                    opponentChoice: playerMove,
                    scores: game.scores,
                });

                // Check if game is over (3 rounds max)
                const totalRounds = game.scores[userId] + game.scores[opponentId];
                if (totalRounds >= 3) {
                    const finalWinner =
                        game.scores[userId] > game.scores[opponentId]
                            ? userId
                            : game.scores[userId] < game.scores[opponentId]
                              ? opponentId
                              : "draw";

                    playerSocket?.emit("finalResult", {
                        winnerId: finalWinner,
                        scores: game.scores,
                    });

                    opponentSocket?.emit("finalResult", {
                        winnerId: finalWinner,
                        scores: game.scores,
                    });

                    try {
                        const match = await Match.findById(matchId);
                        if (match) {
                            if (finalWinner === "draw") {
                                match.winner = undefined;
                                match.result = "draw";
                            } else if (String(finalWinner) === String(match.player1)) {
                                match.winner = finalWinner;
                                match.result = "player1";
                            } else if (String(finalWinner) === String(match.player2)) {
                                match.winner = finalWinner;
                                match.result = "player2";
                            }
                            await match.save();
                            console.log(`Match ${matchId} updated with result: ${match.result}`);
                        }
                        const tournament = await Tournament.findById(match.tournament);
                        const participant = tournament.participants.find(
                            (p) => p.user.toString() === finalWinner
                        );
                        if (participant) {
                            participant.wins += 1;
                            await tournament.save();
                        }
                    } catch (err) {
                        console.error("Failed to update match result:", err);
                    }

                    activeGames.delete(matchId);
                }

                // Clear moves for next round
                game.moves = {};
            }
        });

        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
            // Optionally: Handle cleanup
        });
    });
}

function getWinner(id1, id2, move1, move2) {
    if (move1 === move2) return "draw";

    const beats = {
        rock: "scissors",
        paper: "rock",
        scissors: "paper",
    };

    return beats[move1] === move2 ? id1 : id2;
}
