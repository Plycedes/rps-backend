import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File uploaded", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log("Error while uploading to cloudinary");
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });
        //console.log("File deleted", response);
        return response;
    } catch (error) {
        console.error("Error deleting file:", error);
        return null;
    }
};

const deleteVideoFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "video",
        });
        //console.log("File deleted", response);
        return response;
    } catch (error) {
        console.error("Error deleting file:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary };
