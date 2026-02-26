import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { wrap } from "../middleware/asyncHandler";
import { getDashboard } from "../services/dashboardService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  wrap(async (req, res) => {
    res.json(await getDashboard(req.userId!));
  })
);

export default router;
