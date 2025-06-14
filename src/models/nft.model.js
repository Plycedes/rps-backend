import mongoose from "mongoose";

const nftSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            default: null,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        imageUrl: {
            type: String,
        },
        isListedForSale: {
            type: Boolean,
            default: false,
        },
        price: {
            type: Number,
            default: 0,
        },
        tokenId: {
            type: Number,
            default: null,
        },
    },
    { timestamps: true }
);

export const NFT = mongoose.model("NFT", nftSchema);
