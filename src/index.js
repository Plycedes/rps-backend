import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import fs from "fs";
import path from "path";

dotenv.config({ path: "./env" });

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server Running at PORT: ${process.env.PORT}`);
        });
        const tempDir = path.join("./temp/files");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log("Folder created");
        }
    })
    .catch((err) => {
        console.log("Failed to start server!!", err);
    });
