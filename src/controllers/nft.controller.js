import asyncHandler from "express-async-handler";
import NFT from "../models/NFT.js";
import User from "../models/User.js";
import Tournament from "../models/Tournament.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

/**
 * @desc Admin mints NFT before tournament begins
 */
export const mintNFT = asyncHandler(async (req, res) => {
    const { tournamentId, name, description, imageUrl } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    const adminId = req.user._id;

    const newNFT = await NFT.create({
        owner: adminId,
        tournament: tournament._id,
        name,
        description,
        imageUrl,
    });

    return res.status(201).json(new ApiResponse(201, newNFT, "NFT minted and owned by admin"));
});

/**
 * @desc User lists NFT for sale
 */
export const listNFTForSale = asyncHandler(async (req, res) => {
    const { nftId, price } = req.body;
    const userId = req.user._id;

    const nft = await NFT.findById(nftId);
    if (!nft) throw new ApiError(404, "NFT not found");

    if (!nft.owner.equals(userId)) {
        throw new ApiError(403, "You are not the owner of this NFT");
    }

    nft.isListedForSale = true;
    nft.price = price;
    await nft.save();

    return res.status(200).json(new ApiResponse(200, nft, "NFT listed for sale"));
});

/**
 * @desc User unlists NFT
 */
export const unlistNFT = asyncHandler(async (req, res) => {
    const { nftId } = req.body;
    const userId = req.user._id;

    const nft = await NFT.findById(nftId);
    if (!nft) throw new ApiError(404, "NFT not found");

    if (!nft.owner.equals(userId)) {
        throw new ApiError(403, "You are not the owner of this NFT");
    }

    nft.isListedForSale = false;
    nft.price = 0;
    await nft.save();

    return res.status(200).json(new ApiResponse(200, nft, "NFT unlisted from sale"));
});

/**
 * @desc Buy NFT
 */
export const buyNFT = asyncHandler(async (req, res) => {
    const { nftId } = req.body;
    const buyerId = req.user._id;

    const nft = await NFT.findById(nftId).populate("owner");
    if (!nft) throw new ApiError(404, "NFT not found");

    if (!nft.isListedForSale) {
        throw new ApiError(400, "NFT is not listed for sale");
    }

    if (nft.owner._id.equals(buyerId)) {
        throw new ApiError(400, "You already own this NFT");
    }

    // Simulate the transaction (in real life, you'd integrate with payment / crypto)
    nft.owner = buyerId;
    nft.isListedForSale = false;
    nft.price = 0;

    await nft.save();

    return res.status(200).json(new ApiResponse(200, nft, "NFT purchased successfully"));
});

/**
 * @desc Get all NFTs owned by user
 */
export const getNFTsByUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const nfts = await NFT.find({ owner: userId });

    return res.status(200).json(new ApiResponse(200, nfts, "NFTs retrieved"));
});

/**
 * @desc Get all NFTs listed for sale
 */
export const getNFTsForSale = asyncHandler(async (req, res) => {
    const listedNFTs = await NFT.find({ isListedForSale: true }).populate("owner", "username");

    return res.status(200).json(new ApiResponse(200, listedNFTs, "NFTs for sale"));
});

/**
 * @desc Get NFT by ID
 */
export const getNFTById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const nft = await NFT.findById(id).populate("owner", "username");

    if (!nft) throw new ApiError(404, "NFT not found");

    return res.status(200).json(new ApiResponse(200, nft, "NFT retrieved"));
});
