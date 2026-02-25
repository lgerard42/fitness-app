import type { DashboardData } from "@/types";
import { apiGetDashboard } from "./api";

export async function getUserData(): Promise<DashboardData> {
  return apiGetDashboard();
}
