import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

const {
    MONGODB_USER,
    MONGODB_PASS,
    MONGODB_HOST,
    MONGODB_PORT,
    MONGODB_DB,
} = process.env;

export const connectToDatabase = async (): Promise<void> => {
    if (isConnected) return;

    if (!MONGODB_USER || !MONGODB_PASS || !MONGODB_HOST || !MONGODB_PORT || !MONGODB_DB) {
        console.error('Missing MongoDB environment variables. Database connection will likely fail.');
        return;
    }

    const uri = `mongodb://${MONGODB_USER}:${MONGODB_PASS}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB}?authSource=admin`;

    try {
        await mongoose.connect(uri);
        isConnected = true;
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};
