import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserBalance,
    updateUserWalletAddress,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-avatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/add-balance").post(verifyJWT, updateUserBalance);
router.route("/update-wallet").post(verifyJWT, updateUserWalletAddress);

export default router;
