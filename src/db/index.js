import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URL}/${process.env.DB_NAME}`
        );
        console.log(`MongoDB connected! DB_HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB Connection Failed!!: ", error);
        process.exit(1);
    }
};

export default connectDB;
