import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },
        player1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        player2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        result: {
            type: String,
            enum: ["player1", "player2", "draw", "pending"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const Match = mongoose.model("Match", matchSchema);
