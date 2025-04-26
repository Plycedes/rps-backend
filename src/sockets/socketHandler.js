import { Match } from "../models/match.model.js";
import { Tournament } from "../models/tournament.model.js";

const tournamentLobbies = new Map();
const activeGames = new Map();

export default function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("findOrCreateMatch", async ({ userId, tournamentId }) => {
            socket.userId = userId;
            console.log("Player trying to connect:", userId);

            // Create a new lobby queue for the tournament if it doesn't exist
            if (!tournamentLobbies.has(tournamentId)) {
                tournamentLobbies.set(tournamentId, []);
            }

            const lobbyQueue = tournamentLobbies.get(tournamentId);
            lobbyQueue.push({ userId, socketId: socket.id });

            if (lobbyQueue.length >= 2) {
                const player1 = lobbyQueue.shift();
                const player2 = lobbyQueue.shift();

                // Create a match in the database
                const match = await Match.create({
                    tournament: tournamentId,
                    player1: player1.userId,
                    player2: player2.userId,
                });

                const matchId = match._id.toString();

                const player1Socket = io.sockets.sockets.get(player1.socketId);
                const player2Socket = io.sockets.sockets.get(player2.socketId);

                player1Socket.join(matchId);
                player2Socket.join(matchId);

                player1Socket.matchId = matchId;
                player2Socket.matchId = matchId;

                activeGames.set(matchId, {
                    player1: player1.userId,
                    player2: player2.userId,
                    player1SocketId: player1.socketId,
                    player2SocketId: player2.socketId,
                    moves: {},
                    scores: {},
                });

                io.to(matchId).emit("matchReady", {
                    matchId,
                    player1: player1.userId,
                    player2: player2.userId,
                });

                console.log(
                    `Created match ${matchId} between ${player1.userId} and ${player2.userId} in tournament ${tournamentId}`
                );
            } else {
                socket.emit("waitingForOpponent", {
                    message: "Waiting for an opponent in this tournament...",
                });
                console.log(`User ${userId} is waiting for opponent in tournament ${tournamentId}`);
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

            console.log(`${userId} with ${socket.id} chose ${move}`);
            console.log(`${opponentId} made move ${game.moves[opponentId]}`);

            const playerMove = game.moves[userId];
            const opponentMove = game.moves[opponentId];

            if (!opponentMove) {
                const playerSocket = io.sockets.sockets.get(socket.id);
                playerSocket?.emit("waitingForOpponentChoice");
                return;
            }

            const winnerId = getWinner(userId, opponentId, playerMove, opponentMove);

            game.scores[userId] = (game.scores[userId] || 0) + (winnerId === userId ? 1 : 0);
            game.scores[opponentId] =
                (game.scores[opponentId] || 0) + (winnerId === opponentId ? 1 : 0);

            const playerSocket = io.sockets.sockets.get(
                game.player1 === userId ? game.player1SocketId : game.player2SocketId
            );
            const opponentSocket = io.sockets.sockets.get(
                game.player1 === opponentId ? game.player1SocketId : game.player2SocketId
            );

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
            } else {
                // Reset for next round
                game.moves = {};
            }
        });

        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);

            // Remove from any tournament lobby
            for (const [tournamentId, lobbyQueue] of tournamentLobbies.entries()) {
                const index = lobbyQueue.findIndex((p) => p.socketId === socket.id);
                if (index !== -1) {
                    lobbyQueue.splice(index, 1);
                    console.log(
                        `Removed user ${socket.userId} from lobby of tournament ${tournamentId}`
                    );
                    break;
                }
            }
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
