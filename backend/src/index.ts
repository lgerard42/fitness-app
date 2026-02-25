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
import referenceV1Routes from "./routes/referenceV1";
import dashboardRoutes from "./routes/dashboard";
import personalRecordRoutes from "./routes/personalRecords";
import adminTablesRouter from "./admin/routes/tables";
import adminSchemaRouter from "./admin/routes/schema";
import adminScoringRouter from "./admin/routes/scoring";

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
app.use("/api/v1/reference", referenceV1Routes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/personal-records", personalRecordRoutes);
app.use("/api/admin/tables", adminTablesRouter);
app.use("/api/admin/schema", adminSchemaRouter);
app.use("/api/admin/scoring", adminScoringRouter);

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
