import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { wrap } from "../middleware/asyncHandler";
import {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
} from "../services/profileService";

const router = Router();
router.use(requireAuth);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().optional(),
  bodyWeight: z.number().optional(),
  avatarUrl: z.string().optional(),
});

const updateSettingsSchema = z.object({
  weightUnit: z.enum(["lbs", "kg"]).optional(),
  distanceUnit: z.enum(["US", "Metric"]).optional(),
  weightCalcMode: z.enum(["1x", "2x"]).optional(),
  repsConfigMode: z.enum(["1x", "2x", "lrSplit"]).optional(),
  defaultRestTimerSeconds: z.number().int().min(0).optional(),
  vibrateOnTimerFinish: z.boolean().optional(),
  keepScreenAwake: z.boolean().optional(),
});

router.get(
  "/me",
  wrap(async (req, res) => {
    res.json(await getProfile(req.userId!));
  })
);

router.put(
  "/me",
  wrap(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    res.json(await updateProfile(req.userId!, data));
  })
);

router.get(
  "/me/settings",
  wrap(async (req, res) => {
    res.json(await getSettings(req.userId!));
  })
);

router.put(
  "/me/settings",
  wrap(async (req, res) => {
    const data = updateSettingsSchema.parse(req.body);
    res.json(await updateSettings(req.userId!, data));
  })
);

export default router;
