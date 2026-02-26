import { Router } from "express";
import { z } from "zod";
import { authService, AuthError } from "../auth/authService";
import { requireAuth } from "../middleware/auth";
import { wrap } from "../middleware/asyncHandler";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post(
  "/register",
  wrap(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(
      data.email,
      data.password,
      data.name
    );
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  wrap(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  })
);

router.post(
  "/refresh",
  wrap(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    const result = await authService.refresh(data.refreshToken);
    res.json(result);
  })
);

router.post("/logout", requireAuth, wrap(async (req, res) => {
  await authService.logout(req.userId!);
  res.json({ ok: true });
}));

export default router;
