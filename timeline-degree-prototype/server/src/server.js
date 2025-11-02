import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import "./config/redis.js"; // initialize Redis

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 4000;

// Function that safely starts the server only after DB connection
const startServer = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await connectDB();
        console.log("✅ MongoDB connected successfully");

        app.listen(PORT, () =>
            console.log(`🚀 Server running and listening on port ${PORT}`)
        );
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error.message);
        console.log("🔁 Retrying in 5 seconds...");
        setTimeout(startServer, 5000); // retry after 5 seconds
    }
};

// Start everything
startServer();
