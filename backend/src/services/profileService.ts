import { prisma } from "../config/db";

export type UpdateProfileData = {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  bodyWeight?: number;
  avatarUrl?: string;
};

export type UpdateSettingsData = {
  weightUnit?: "lbs" | "kg";
  distanceUnit?: "US" | "Metric";
  weightCalcMode?: "1x" | "2x";
  repsConfigMode?: "1x" | "2x" | "lrSplit";
  defaultRestTimerSeconds?: number;
  vibrateOnTimerFinish?: boolean;
  keepScreenAwake?: boolean;
};

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  const { passwordHash, ...profile } = user;
  return profile;
}

export async function updateProfile(userId: string, data: UpdateProfileData) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  const { passwordHash, ...profile } = user;
  return profile;
}

export async function getSettings(userId: string) {
  return prisma.userSettings.findUnique({
    where: { userId },
  });
}

export async function updateSettings(userId: string, data: UpdateSettingsData) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
