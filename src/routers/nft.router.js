import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    mintNFT,
    listNFTForSale,
    buyNFT,
    unlistNFT,
    getNFTById,
    getNFTsByUser,
    getNFTsForSale,
} from "../controllers/nft.controller.js";

const router = Router();

router.route("/mint").post(verifyJWT, mintNFT);
router.route("/list").post(verifyJWT, listNFTForSale);
router.route("/buy").post(verifyJWT, buyNFT);
router.route("/unlist").post(verifyJWT, unlistNFT);

router.route("/nft/:id").get(getNFTById);
router.route("/user-nft").get(getNFTsByUser);
router.route("/nft-for-sale").get(getNFTsForSale);

export default router;
