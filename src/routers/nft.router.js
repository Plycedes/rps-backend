import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    mintNFT,
    listNFTForSale,
    buyNFT,
    unlistNFT,
    getNFTById,
    getNFTsByUser,
    getNFTsForSale,
    setNFTTokenId,
} from "../controllers/nft.controller.js";

const router = Router();

router.route("/mint").post(verifyJWT, upload.single("nftImg"), mintNFT);
router.route("/list").post(verifyJWT, listNFTForSale);
router.route("/buy").post(verifyJWT, buyNFT);
router.route("/unlist").post(verifyJWT, unlistNFT);
router.route("/set-token").post(verifyJWT, setNFTTokenId);

router.route("/nft/:id").get(verifyJWT, getNFTById);
router.route("/user-nft").get(verifyJWT, getNFTsByUser);
router.route("/nft-for-sale").get(verifyJWT, getNFTsForSale);

export default router;
