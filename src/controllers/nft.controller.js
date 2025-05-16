import { asyncHandler } from "../utils/asyncHandler.js";
import { NFT } from "../models/nft.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const mintNFT = asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
        throw new ApiError(403, "You are not allowed to mint NFTs");
    }
    const { name, description } = req.body;

    const nftLocalPath = req.file?.path;

    if (!nftLocalPath) {
        throw new ApiError(400, "NFT image is missing");
    }

    const nft = await uploadOnCloudinary(nftLocalPath);

    const adminId = req.user._id;

    const newNFT = await NFT.create({
        owner: adminId,
        name,
        description,
        imageUrl: nft.secure_url,
    });

    return res.status(201).json(new ApiResponse(201, newNFT, "NFT minted and owned by admin"));
});

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

    const buyer = await User.findById(buyerId);
    const seller = await User.findById(nft.owner._id);

    if (buyer.balance < nft.price) {
        throw new ApiError(400, "Insufficient balance to purchase this NFT");
    }

    buyer.balance -= nft.price;
    seller.balance += nft.price;

    nft.owner = buyer._id;
    nft.isListedForSale = false;
    nft.price = 0;

    await Promise.all([buyer.save(), seller.save(), nft.save()]);

    return res.status(200).json(new ApiResponse(200, nft, "NFT purchased successfully"));
});

export const setNFTTokenId = asyncHandler(async (req, res) => {
    const { nftId, tokenId } = req.body;
    const userId = req.user._id;

    const nft = await NFT.findById(nftId);
    if (!nft) throw new ApiError(404, "NFT not found");

    nft.tokenId = tokenId;
    await nft.save();

    return res.status(200).json(new ApiResponse(200, nft, "NFT tokenId updated successfully"));
});

export const getNFTsByUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const nfts = await NFT.find({ owner: userId });

    return res.status(200).json(new ApiResponse(200, nfts, "NFTs retrieved"));
});

export const getNFTsForSale = asyncHandler(async (req, res) => {
    const listedNFTs = await NFT.find({ isListedForSale: true }).populate("owner", "username");

    return res.status(200).json(new ApiResponse(200, listedNFTs, "NFTs for sale"));
});

export const getNFTById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const nft = await NFT.findById(id).populate("owner", "username");

    if (!nft) throw new ApiError(404, "NFT not found");

    return res.status(200).json(new ApiResponse(200, nft, "NFT retrieved"));
});
