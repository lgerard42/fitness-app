import express from "express";
import cors from "cors";
import { config } from "./config";
import { prisma } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import workoutRoutes from "./routes/workouts";
import exerciseRoutes from "./routes/exercises";
import measurementRoutes from "./routes/measurements";
import goalRoutes from "./routes/goals";
import referenceRoutes from "./routes/reference";
import scoringRoutes from "./routes/scoring";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", referenceSource: config.referenceDataSource });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/scoring", scoringRoutes);

// Error handler (must be last)
app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL");
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Only Fit API running at http://localhost:${config.port}`);
    console.log(`Reference data source: ${config.referenceDataSource}`);
  });
}

start();
