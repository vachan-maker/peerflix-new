import mongoose from "mongoose";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
    try {
        const connectDB = await mongoose.connect(process.env.CONNECTION_STRING, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        });
        console.log("Database Connected:",connectDB.connection.host);

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected! Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected!');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

    }catch(error) {
        console.log("MongoDB initial connection error:", error);
        process.exit(1);
    }
}

export default connectDB;