import { asyncHandler } from "../utils/asyncHandler.js";
import { NFT } from "../models/nft.model.js";
import { Tournament } from "../models/tournament.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const createTournament = asyncHandler(async (req, res) => {
    const { name, reward, endDate } = req.body;
    const createdBy = req.user._id;

    if (!name || !reward || !endDate) {
        throw new ApiError(400, "Name, reward, and end date are required");
    }

    const nft = await NFT.findById(reward);
    if (!nft) {
        throw new ApiError(404, "Reward NFT not found");
    }

    if (!nft.owner.equals(createdBy)) {
        throw new ApiError(403, "You don't own the reward NFT");
    }

    if (nft.isListedForSale) {
        throw new ApiError(400, "Cannot use a listed NFT as a reward");
    }

    const tournament = await Tournament.create({
        name,
        createdBy,
        reward,
        endDate: new Date(endDate),
    });

    return res
        .status(201)
        .json(new ApiResponse(201, tournament, "Tournament created successfully"));
});

export const joinTournament = asyncHandler(async (req, res) => {
    const { tournamentId } = req.body;
    const userId = req.user._id;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    const alreadyJoined = tournament.participants.some(
        (p) => p.user.toString() === userId.toString()
    );

    if (alreadyJoined) {
        throw new ApiError(400, "You have already joined this tournament");
    }

    tournament.participants.push({ user: userId });
    await tournament.save();

    return res.status(200).json(new ApiResponse(200, tournament, "Joined tournament successfully"));
});

export const completeTournament = asyncHandler(async (req, res) => {
    const { tournamentId } = req.body;
    const userId = req.user._id;

    const tournament = await Tournament.findById(tournamentId)
        .populate("participants.user")
        .populate("reward");

    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    if (!tournament.createdBy.equals(userId)) {
        throw new ApiError(403, "Only the creator can complete the tournament");
    }

    if (tournament.status === "completed") {
        throw new ApiError(400, "Tournament already completed");
    }

    let winnerParticipant = null;
    for (const p of tournament.participants) {
        if (!winnerParticipant || p.wins > winnerParticipant.wins) {
            winnerParticipant = p;
        }
    }

    const winnerUserId = winnerParticipant?.user._id;
    if (!winnerUserId) {
        throw new ApiError(400, "No participants with wins to determine a winner");
    }

    const rewardNFT = await NFT.findById(tournament.reward._id);
    rewardNFT.owner = winnerUserId;
    rewardNFT.isListedForSale = false;
    rewardNFT.price = 0;
    await rewardNFT.save();

    tournament.status = "completed";
    tournament.winner = winnerUserId;
    await tournament.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tournament,
                "Tournament marked as completed and reward transferred"
            )
        );
});

export const getActiveTournaments = asyncHandler(async (req, res) => {
    const tournaments = await Tournament.find({
        status: { $in: ["pending", "ongoing"] },
    })
        .populate("createdBy", "username")
        .sort({ updatedAt: -1 });

    return res.status(200).json(new ApiResponse(200, tournaments, "Active tournaments fetched"));
});

export const getPreviousTournaments = asyncHandler(async (req, res) => {
    const tournaments = await Tournament.find({ status: "completed" })
        .populate("createdBy", "username")
        .populate("winner", "username")
        .sort({ updatedAt: -1 });

    return res.status(200).json(new ApiResponse(200, tournaments, "Previous tournaments fetched"));
});

export const getTournamentLeaderboard = asyncHandler(async (req, res) => {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findById(tournamentId).populate(
        "participants.user",
        "username avatar"
    );

    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    const leaderboard = [...tournament.participants].sort((a, b) => b.wins - a.wins);

    return res
        .status(200)
        .json(new ApiResponse(200, leaderboard, "Tournament leaderboard fetched"));
});
