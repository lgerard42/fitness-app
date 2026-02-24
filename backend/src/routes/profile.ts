import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

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
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { settings: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash, ...profile } = user;
    res.json(profile);
  })
);

router.put(
  "/me",
  wrap(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    });
    const { passwordHash, ...profile } = user;
    res.json(profile);
  })
);

router.get(
  "/me/settings",
  wrap(async (req, res) => {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });
    res.json(settings);
  })
);

router.put(
  "/me/settings",
  wrap(async (req, res) => {
    const data = updateSettingsSchema.parse(req.body);
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId!, ...data },
    });
    res.json(settings);
  })
);

export default router;
