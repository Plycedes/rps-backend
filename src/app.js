import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send({ statusCode: 200, status: "OK" });
});

import userRouter from "./routers/user.router.js";
import nftRouter from "./routers/nft.router.js";
import matchRouter from "./routers/match.router.js";
import tournamentRouter from "./routers/tournament.router.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/nfts", nftRouter);
app.use("/api/v1/matches", matchRouter);
app.use("/api/v1/tournaments", tournamentRouter);

export { app };
