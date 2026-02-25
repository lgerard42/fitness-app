import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Ensure .env is loaded before PrismaClient is used
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    "DATABASE_URL is not set. Add it to backend/.env (see .env.example)."
  );
}

export const prisma = new PrismaClient();
