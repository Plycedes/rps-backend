import { asyncHandler } from "../utils/asyncHandler.js";
import { Match } from "../models/match.model.js";
import { User } from "../models/user.model.js";
import { Tournament } from "../models/tournament.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const createMatch = asyncHandler(async (req, res) => {
    const { tournamentId, player1, player2 } = req.body;
    const createdBy = req.user._id;

    if (!tournamentId || !player1 || !player2) {
        throw new ApiError(400, "Tournament ID and both players are required");
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    if (!tournament.createdBy.equals(createdBy)) {
        throw new ApiError(403, "Only the tournament creator can create matches");
    }

    if (player1 === player2) {
        throw new ApiError(400, "Players must be different");
    }

    const match = await Match.create({
        tournament: tournamentId,
        player1,
        player2,
    });

    return res.status(201).json(new ApiResponse(201, match, "Match created successfully"));
});

export const getTournamentMatches = asyncHandler(async (req, res) => {
    const { tournamentId } = req.params;

    const matches = await Match.find({ tournament: tournamentId })
        .populate("player1", "username")
        .populate("player2", "username")
        .populate("winner", "username");

    return res.status(200).json(new ApiResponse(200, matches, "Tournament matches fetched"));
});

export const getMatchById = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
        .populate("player1", "username")
        .populate("player2", "username")
        .populate("winner", "username")
        .populate("tournament", "name");

    if (!match) throw new ApiError(404, "Match not found");

    return res.status(200).json(new ApiResponse(200, match, "Match details fetched"));
});

export const updateMatchResult = asyncHandler(async (req, res) => {
    const { matchId, result } = req.body;
    const allowedResults = ["player1", "player2", "draw"];

    if (!allowedResults.includes(result)) {
        throw new ApiError(400, "Invalid match result");
    }

    const match = await Match.findById(matchId);
    if (!match) {
        throw new ApiError(404, "Match not found");
    }

    if (match.result !== "pending") {
        throw new ApiError(400, "Match already concluded");
    }

    let winner = null;

    if (result === "player1") {
        winner = match.player1;
    } else if (result === "player2") {
        winner = match.player2;
    }

    match.result = result;
    match.winner = winner;
    await match.save();

    // Optional: Update participant win count in the tournament
    if (winner) {
        const tournament = await Tournament.findById(match.tournament);
        const participant = tournament.participants.find(
            (p) => p.user.toString() === winner.toString()
        );
        if (participant) {
            participant.wins += 1;
            await tournament.save();
        }
    }

    return res.status(200).json(new ApiResponse(200, match, "Match result updated successfully"));
});

export const getGlobalLeaderboard = asyncHandler(async (req, res) => {
    const leaderboard = await User.aggregate([
        {
            $match: { isAdmin: false },
        },
        {
            $lookup: {
                from: "tournaments",
                localField: "_id",
                foreignField: "participants.user",
                as: "tournaments",
            },
        },
        {
            $addFields: {
                totalWins: {
                    $sum: {
                        $map: {
                            input: "$tournaments",
                            as: "t",
                            in: {
                                $let: {
                                    vars: {
                                        matchedParticipant: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$$t.participants",
                                                        as: "p",
                                                        cond: { $eq: ["$$p.user", "$_id"] },
                                                    },
                                                },
                                                0,
                                            ],
                                        },
                                    },
                                    in: "$$matchedParticipant.wins",
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                avatar: 1,
                totalWins: 1,
            },
        },
        {
            $sort: { totalWins: -1 },
        },
    ]);

    return res.status(200).json(new ApiResponse(200, leaderboard, "Global leaderboard fetched"));
});

export const getUserMatches = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const matches = await Match.aggregate([
        {
            $match: {
                $or: [{ player1: userId }, { player2: userId }],
            },
        },
        {
            $lookup: {
                from: "tournaments",
                localField: "tournament",
                foreignField: "_id",
                as: "tournament",
            },
        },
        { $unwind: "$tournament" },
        {
            $addFields: {
                opponentId: {
                    $cond: [{ $eq: ["$player1", userId] }, "$player2", "$player1"],
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "opponentId",
                foreignField: "_id",
                as: "opponent",
            },
        },
        { $unwind: "$opponent" },
        {
            $lookup: {
                from: "users",
                localField: "winner",
                foreignField: "_id",
                as: "winner",
            },
        },
        {
            $unwind: {
                path: "$winner",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $addFields: {
                outcome: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq: ["$result", "draw"] },
                                then: "draw",
                            },
                            {
                                case: {
                                    $and: [
                                        { $ne: ["$result", "pending"] },
                                        { $eq: ["$winner._id", userId] },
                                    ],
                                },
                                then: "won",
                            },
                            {
                                case: {
                                    $and: [
                                        { $ne: ["$result", "pending"] },
                                        { $ne: ["$winner._id", userId] },
                                    ],
                                },
                                then: "lost",
                            },
                        ],
                        default: "pending",
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                tournament: "$tournament.name",
                opponent: "$opponent.username",
                outcome: 1,
                createdAt: 1,
            },
        },
        { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json(new ApiResponse(200, matches, "User's matches summary fetched"));
});
