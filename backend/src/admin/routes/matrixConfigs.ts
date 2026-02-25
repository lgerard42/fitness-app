import { Router, Request, Response } from "express";
import { matrixConfigService } from "../../services/matrixConfigService";
import { matrixV2Resolver } from "../../services/matrixV2Resolver";
import { runStructuralValidation } from "../../../../shared/validators/matrixV2Validator";
import type {
  MatrixScopeType,
  MatrixConfigStatus,
  MatrixConfigJson,
  ResolverMode,
} from "../../../../shared/types/matrixV2";

const router = Router();

// ─── List configs ────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const configs = await matrixConfigService.list({
      scope_type: req.query.scope_type as MatrixScopeType | undefined,
      scope_id: req.query.scope_id as string | undefined,
      status: req.query.status as MatrixConfigStatus | undefined,
      include_deleted: req.query.include_deleted === "true",
    });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: `Failed to list configs: ${err}` });
  }
});

// ─── Create new config (draft) ──────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const { scope_type, scope_id, config_json, notes } = req.body;
    if (!scope_type || !scope_id || !config_json) {
      res.status(400).json({ error: "scope_type, scope_id, and config_json are required" });
      return;
    }

    const structural = runStructuralValidation(config_json);
    const config = await matrixConfigService.create({
      scope_type,
      scope_id,
      config_json,
      notes,
    });

    res.status(201).json({ config, validation: structural });
  } catch (err) {
    res.status(500).json({ error: `Failed to create config: ${err}` });
  }
});

// ─── Get single config ──────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const config = await matrixConfigService.getById(req.params.id);
    if (!config) {
      res.status(404).json({ error: "Config not found" });
      return;
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: `Failed to get config: ${err}` });
  }
});

// ─── Update draft config ────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { config_json, notes } = req.body;
    const config = await matrixConfigService.update(req.params.id, {
      config_json,
      notes,
    });
    if (!config) {
      res.status(404).json({ error: "Config not found" });
      return;
    }
    res.json(config);
  } catch (err: any) {
    if (err.message?.includes("Cannot edit an active")) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: `Failed to update config: ${err}` });
  }
});

// ─── Soft-delete config ─────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const result = await matrixConfigService.softDelete(req.params.id);
    if (!result.ok) {
      const status = result.error?.includes("active") ? 409 : 404;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete config: ${err}` });
  }
});

// ─── Validate config ────────────────────────────────────────────────
router.post("/:id/validate", async (req: Request, res: Response) => {
  try {
    const result = await matrixConfigService.validate(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to validate config: ${err}` });
  }
});

// ─── Activate config ────────────────────────────────────────────────
router.post("/:id/activate", async (req: Request, res: Response) => {
  try {
    const result = await matrixConfigService.activate(req.params.id);
    if ("error" in result) {
      res.status(422).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to activate config: ${err}` });
  }
});

// ─── Clone config to new draft ──────────────────────────────────────
router.post("/:id/clone", async (req: Request, res: Response) => {
  try {
    const cloned = await matrixConfigService.clone(req.params.id);
    if (!cloned) {
      res.status(404).json({ error: "Source config not found" });
      return;
    }
    res.status(201).json(cloned);
  } catch (err) {
    res.status(500).json({ error: `Failed to clone config: ${err}` });
  }
});

// ─── Resolve effective config for a motion ──────────────────────────
router.get("/resolve/:motionId", async (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as ResolverMode) || "active_only";
    const result = await matrixV2Resolver.resolve(req.params.motionId, mode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to resolve config: ${err}` });
  }
});

// ─── Export config as JSON ──────────────────────────────────────────
router.get("/export/:id", async (req: Request, res: Response) => {
  try {
    const config = await matrixConfigService.getById(req.params.id);
    if (!config) {
      res.status(404).json({ error: "Config not found" });
      return;
    }

    const exportData = {
      _export_version: "1.0",
      _exported_at: new Date().toISOString(),
      id: config.id,
      scope_type: config.scope_type,
      scope_id: config.scope_id,
      status: config.status,
      schema_version: config.schema_version,
      config_version: config.config_version,
      config_json: config.config_json,
      notes: config.notes,
    };

    const sorted = sortObjectKeys(exportData);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="matrix-config-${config.scope_type}-${config.scope_id}.json"`,
    );
    res.send(JSON.stringify(sorted, null, 2));
  } catch (err) {
    res.status(500).json({ error: `Failed to export config: ${err}` });
  }
});

// ─── Import config JSON ─────────────────────────────────────────────
router.post("/import", async (req: Request, res: Response) => {
  try {
    const { data, mode } = req.body;
    if (!data || !data.config_json || !data.scope_type || !data.scope_id) {
      res.status(400).json({
        error: "Import data must include scope_type, scope_id, and config_json",
      });
      return;
    }

    const structural = runStructuralValidation(data.config_json);
    if (!structural.can_activate && mode !== "preview") {
      res.json({ preview: data, validation: structural, imported: false });
      return;
    }

    if (mode === "preview") {
      res.json({ preview: data, validation: structural, imported: false });
      return;
    }

    const config = await matrixConfigService.create({
      scope_type: data.scope_type,
      scope_id: data.scope_id,
      config_json: data.config_json,
      notes: data.notes || `Imported at ${new Date().toISOString()}`,
    });

    const fullValidation = await matrixConfigService.validate(config.id);

    res.status(201).json({
      config,
      validation: fullValidation,
      imported: true,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to import config: ${err}` });
  }
});

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

export default router;
