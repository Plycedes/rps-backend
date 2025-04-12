import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import setupSocketHandlers from "./sockets/socketHandler.js";

dotenv.config({ path: "./env" });

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
    },
});

connectDB()
    .then(() => {
        server.listen(process.env.PORT || 8000, () => {
            console.log(`Server Running at PORT: ${process.env.PORT}`);
        });

        const tempDir = path.join("./temp/files");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log("Folder created");
        }

        setupSocketHandlers(io); // initialize socket logic
    })
    .catch((err) => {
        console.log("Failed to start server!!", err);
    });
