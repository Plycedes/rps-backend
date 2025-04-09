import multer from "multer";
import { v4 } from "uuid";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./temp/files");
    },
    filename: function (req, file, cb) {
        cb(null, v4() + file.originalname);
    },
    limits: { fileSize: 200 * 1024 * 1024 },
});

export const upload = multer({ storage });
