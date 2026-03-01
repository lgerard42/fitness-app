import { z } from "zod";

const triggerConditionSchema = z.object({
  tableKey: z.string().min(1),
  operator: z.enum(["eq", "in", "not_eq", "not_in"]),
  value: z.union([z.string(), z.array(z.string())]),
});

const switchMotionPayloadSchema = z.object({
  proxy_motion_id: z.string().min(1),
});

const replaceDeltaPayloadSchema = z.object({
  table_key: z.string().min(1),
  row_id: z.string().min(1),
  deltas: z.record(z.string(), z.number()),
});

const clampMusclePayloadSchema = z.object({
  clamps: z.record(z.string(), z.number()),
});

const VALID_ACTION_TYPES = ["SWITCH_MOTION", "REPLACE_DELTA", "CLAMP_MUSCLE"] as const;

export interface ComboRuleValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate the structural integrity of combo rule JSONB fields.
 * Used at author time (admin save) and optionally in lint.
 */
export function validateComboRule(rule: {
  action_type: string;
  trigger_conditions_json: unknown;
  action_payload_json: unknown;
}): ComboRuleValidationResult {
  const errors: string[] = [];

  if (!VALID_ACTION_TYPES.includes(rule.action_type as any)) {
    errors.push(
      `Invalid action_type "${rule.action_type}". Must be one of: ${VALID_ACTION_TYPES.join(", ")}`
    );
  }

  const conditionsResult = z.array(triggerConditionSchema).safeParse(rule.trigger_conditions_json);
  if (!conditionsResult.success) {
    for (const issue of conditionsResult.error.issues) {
      errors.push(`trigger_conditions_json${issue.path.length ? "." + issue.path.join(".") : ""}: ${issue.message}`);
    }
  } else if (conditionsResult.data.length === 0) {
    errors.push("trigger_conditions_json must have at least one condition");
  }

  if (rule.action_type === "SWITCH_MOTION") {
    const payloadResult = switchMotionPayloadSchema.safeParse(rule.action_payload_json);
    if (!payloadResult.success) {
      for (const issue of payloadResult.error.issues) {
        errors.push(`action_payload_json.${issue.path.join(".")}: ${issue.message}`);
      }
    }
  } else if (rule.action_type === "REPLACE_DELTA") {
    const payloadResult = replaceDeltaPayloadSchema.safeParse(rule.action_payload_json);
    if (!payloadResult.success) {
      for (const issue of payloadResult.error.issues) {
        errors.push(`action_payload_json.${issue.path.join(".")}: ${issue.message}`);
      }
    }
  } else if (rule.action_type === "CLAMP_MUSCLE") {
    const payloadResult = clampMusclePayloadSchema.safeParse(rule.action_payload_json);
    if (!payloadResult.success) {
      for (const issue of payloadResult.error.issues) {
        errors.push(`action_payload_json.${issue.path.join(".")}: ${issue.message}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export {
  triggerConditionSchema,
  switchMotionPayloadSchema,
  replaceDeltaPayloadSchema,
  clampMusclePayloadSchema,
};
