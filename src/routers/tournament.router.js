import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createTournament,
    joinTournament,
    completeTournament,
    getActiveTournaments,
    getPreviousTournaments,
    getTournamentLeaderboard,
} from "../controllers/tournament.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createTournament);
router.route("/join").post(verifyJWT, joinTournament);
router.route("/complete").post(verifyJWT, completeTournament);

router.route("/get-active").get(verifyJWT, getActiveTournaments);
router.route("/get-previous").get(verifyJWT, getPreviousTournaments);
router.route("/get/:tournamentId").get(verifyJWT, getTournamentLeaderboard);

export default router;
