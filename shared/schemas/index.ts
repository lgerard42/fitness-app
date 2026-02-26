import { z } from "zod";

// ─── Muscle Targets Schema ───────────────────────────────────────────
// Flat map: muscleId → score (number)

export const muscleTargetsSchema = z.record(
  z.string(),
  z.number()
);

// ─── Delta Rules Schema ──────────────────────────────────────────────

export const deltaRulesSchema = z.record(
  z.string(),
  z.union([z.record(z.string(), z.number()), z.literal("inherit")])
);

// ─── Modifier Row Schema ─────────────────────────────────────────────

export const modifierRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  delta_rules: z.any().optional(),
  parent_id: z.union([z.string(), z.null()]).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
  icon: z.union([z.string(), z.null()]).optional(),
  common_names: z.array(z.string()).optional(),
  short_description: z.string().optional(),
}).catchall(z.any());

// ─── Motion Schema ───────────────────────────────────────────────────

export const motionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  parent_id: z.union([z.string(), z.null()]),
  upper_lower: z.array(z.union([z.literal("UPPER"), z.literal("LOWER")])),
  muscle_targets: z.record(z.string(), z.number()),
  default_delta_configs: z.record(z.string(), z.string()).optional().default({}),
  common_names: z.array(z.string()).optional(),
  short_description: z.string().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
  icon: z.union([z.string(), z.null()]).optional(),
}).catchall(z.any());

// ─── Equipment Schema ────────────────────────────────────────────────

export const modifierConstraintsSchema = z.record(
  z.string(),
  z.array(z.string())
);

export const equipmentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category_id: z.string(),
  modifier_constraints: z.record(z.string(), z.array(z.string())).optional().default({}),
  is_attachment: z.boolean().optional(),
  requires_attachment: z.boolean().optional(),
  max_instances: z.number().optional(),
  common_names: z.array(z.string()).optional(),
  short_description: z.string().optional(),
  is_active: z.boolean().optional(),
}).catchall(z.any());

// ─── Exercise Category Schema ────────────────────────────────────────

export const exerciseInputPermissionsSchema = z.record(
  z.string(),
  z.union([z.literal("allowed"), z.literal("required"), z.literal("disallowed")])
);

export const exerciseCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  exercise_input_permissions: z.record(
    z.string(),
    z.union([z.literal("allowed"), z.literal("required"), z.literal("disallowed")])
  ),
  is_active: z.boolean().optional(),
}).catchall(z.any());

// ─── Muscle Schema ───────────────────────────────────────────────────

export const muscleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  parent_ids: z.array(z.string()),
  upper_lower: z.array(z.union([z.literal("UPPER"), z.literal("LOWER")])).optional(),
  technical_name: z.string().optional(),
  common_names: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
}).catchall(z.any());

// ─── Score Policy Schema ─────────────────────────────────────────────

export const scorePolicySchema = z.object({
  clampMin: z.number().default(0),
  clampMax: z.number().default(5),
  normalizeOutput: z.boolean().default(false),
  missingKeyBehavior: z.union([
    z.literal("skip"),
    z.literal("zero"),
    z.literal("error"),
  ]).default("skip"),
  outputMode: z.union([
    z.literal("raw"),
    z.literal("normalized"),
    z.literal("both"),
  ]).default("raw"),
});

// ─── Validation Helpers ──────────────────────────────────────────────

export function validateMotion(data: unknown) {
  return motionSchema.safeParse(data);
}

export function validateModifierRow(data: unknown) {
  return modifierRowSchema.safeParse(data);
}

export function validateEquipment(data: unknown) {
  return equipmentSchema.safeParse(data);
}

export function validateExerciseCategory(data: unknown) {
  return exerciseCategorySchema.safeParse(data);
}

export function validateMuscle(data: unknown) {
  return muscleSchema.safeParse(data);
}

export function validateDeltaRules(data: unknown) {
  return deltaRulesSchema.safeParse(data);
}
