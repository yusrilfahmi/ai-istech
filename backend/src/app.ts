import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import conversationRoutes from "./routes/conversation.routes";
import chatRoutes from "./routes/chat.routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import userRoutes from "./routes/user.routes";
import compressorRoutes from "./routes/compressor.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import mlTrainingRoutes from "./routes/ml-training.routes";

dotenv.config();

const app = express();

// CORS — allow frontend origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Static uploads directory
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/compressor-telemetry", compressorRoutes);
app.use("/api/ml-training", mlTrainingRoutes);

// Error handling
app.use(errorMiddleware);

export default app;
