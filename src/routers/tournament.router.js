import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createTournament,
    joinTournament,
    completeTournament,
    getActiveTournaments,
    getPreviousTournaments,
    getTournamentLeaderboard,
    getTournamentById,
    getUserTournaments,
} from "../controllers/tournament.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createTournament);
router.route("/join").post(verifyJWT, joinTournament);
router.route("/complete").post(verifyJWT, completeTournament);

router.route("/get-active").get(verifyJWT, getActiveTournaments);
router.route("/get-previous").get(verifyJWT, getPreviousTournaments);
router.route("/get-leaderboard/:tournamentId").get(verifyJWT, getTournamentLeaderboard);
router.route("/get/:tournamentId").get(verifyJWT, getTournamentById);
router.route("/get-user").get(verifyJWT, getUserTournaments);

export default router;
