import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createMatch,
    getTournamentMatches,
    getMatchById,
    updateMatchResult,
} from "../controllers/match.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createMatch);
router.route("/update-result").post(verifyJWT, updateMatchResult);

router.route("/get-tournament-matches").get(verifyJWT, getTournamentMatches);
router.route("/get/:matchId").get(verifyJWT, getMatchById);

export default router;
