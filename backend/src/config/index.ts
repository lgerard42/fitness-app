import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};
