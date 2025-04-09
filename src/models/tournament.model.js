import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        wins: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const tournamentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        participants: [participantSchema],
        status: {
            type: String,
            enum: ["pending", "ongoing", "completed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Tournament", tournamentSchema);
