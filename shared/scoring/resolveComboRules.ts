import type {
  ComboRule,
  TriggerCondition,
  ModifierSelection,
  ComboRuleResolutionResult,
  RuleFiredEntry,
  ReplaceDeltaPayload,
  SwitchMotionPayload,
  ClampMusclePayload,
} from "../types";

/**
 * Evaluate whether a single trigger condition matches the active modifier set.
 * The selection is treated as a set — order does not matter.
 */
function conditionMatches(
  cond: TriggerCondition,
  selectionsByTable: Map<string, Set<string>>
): boolean {
  const selected = selectionsByTable.get(cond.tableKey);
  const values = Array.isArray(cond.value) ? cond.value : [cond.value];

  switch (cond.operator) {
    case "eq":
      return selected !== undefined && values.some((v) => selected.has(v));
    case "in":
      return selected !== undefined && values.some((v) => selected.has(v));
    case "not_eq":
      return selected === undefined || !values.some((v) => selected.has(v));
    case "not_in":
      return selected === undefined || !values.some((v) => selected.has(v));
    default:
      return false;
  }
}

/**
 * Compute specificity as the number of trigger conditions (more = more specific).
 */
function computeSpecificity(rule: ComboRule): number {
  const conditions = rule.trigger_conditions_json;
  return Array.isArray(conditions) ? conditions.length : 0;
}

/**
 * Compare two rules for tie-breaking: specificity → priority → id.
 * Returns negative if a wins, positive if b wins.
 */
function compareRules(a: ComboRule, b: ComboRule): number {
  const specA = computeSpecificity(a);
  const specB = computeSpecificity(b);
  if (specA !== specB) return specB - specA;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function winnerReason(
  winner: ComboRule,
  others: ComboRule[]
): RuleFiredEntry["winnerReason"] {
  if (others.length === 0) return "only match";
  const specW = computeSpecificity(winner);
  if (others.every((o) => computeSpecificity(o) < specW)) return "highest specificity";
  if (others.every((o) => o.priority < winner.priority)) return "priority tie-break";
  return "id tie-break";
}

/**
 * Resolve combo rules for a motion given the active modifier selections.
 *
 * Matching is explicitly order-independent: selectedModifiers is converted
 * to a Set-based lookup (tableKey → Set<rowId>) before evaluation.
 * Only condition content and tie-breaking (specificity → priority → id)
 * determine which rules fire.
 *
 * For SWITCH_MOTION, only the highest-priority match fires (exclusive).
 * For REPLACE_DELTA and CLAMP_MUSCLE, all matching rules contribute (additive).
 */
export function resolveComboRules(
  motionId: string,
  selectedModifiers: ModifierSelection[],
  rules: ComboRule[]
): ComboRuleResolutionResult {
  const selectionsByTable = new Map<string, Set<string>>();
  for (const sel of selectedModifiers) {
    if (!selectionsByTable.has(sel.tableKey)) {
      selectionsByTable.set(sel.tableKey, new Set());
    }
    selectionsByTable.get(sel.tableKey)!.add(sel.rowId);
  }

  const matchingRules: ComboRule[] = [];
  for (const rule of rules) {
    if (rule.motion_id !== motionId || !rule.is_active) continue;
    const conditions: TriggerCondition[] = Array.isArray(rule.trigger_conditions_json)
      ? rule.trigger_conditions_json
      : [];
    if (conditions.length === 0) continue;
    if (conditions.every((c) => conditionMatches(c, selectionsByTable))) {
      matchingRules.push(rule);
    }
  }

  matchingRules.sort(compareRules);

  let effectiveMotionId = motionId;
  const deltaOverrides: ReplaceDeltaPayload[] = [];
  const clampMap: Record<string, number> = {};
  const rulesFired: RuleFiredEntry[] = [];

  const switchCandidates = matchingRules.filter((r) => r.action_type === "SWITCH_MOTION");
  const replaceCandidates = matchingRules.filter((r) => r.action_type === "REPLACE_DELTA");
  const clampCandidates = matchingRules.filter((r) => r.action_type === "CLAMP_MUSCLE");

  if (switchCandidates.length > 0) {
    const winner = switchCandidates[0];
    const payload = winner.action_payload_json as SwitchMotionPayload;
    effectiveMotionId = payload.proxy_motion_id;
    rulesFired.push({
      ruleId: winner.id,
      ruleLabel: winner.label,
      actionType: "SWITCH_MOTION",
      matchedConditions: winner.trigger_conditions_json,
      specificity: computeSpecificity(winner),
      priority: winner.priority,
      winnerReason: winnerReason(winner, switchCandidates.slice(1)),
    });
  }

  for (const rule of replaceCandidates) {
    const payload = rule.action_payload_json as ReplaceDeltaPayload;
    deltaOverrides.push(payload);
    rulesFired.push({
      ruleId: rule.id,
      ruleLabel: rule.label,
      actionType: "REPLACE_DELTA",
      matchedConditions: rule.trigger_conditions_json,
      specificity: computeSpecificity(rule),
      priority: rule.priority,
      winnerReason: replaceCandidates.length === 1
        ? "only match"
        : winnerReason(rule, replaceCandidates.filter((r) => r.id !== rule.id)),
    });
  }

  for (const rule of clampCandidates) {
    const payload = rule.action_payload_json as ClampMusclePayload;
    for (const [muscleId, cap] of Object.entries(payload.clamps)) {
      clampMap[muscleId] = muscleId in clampMap
        ? Math.min(clampMap[muscleId], cap)
        : cap;
    }
    rulesFired.push({
      ruleId: rule.id,
      ruleLabel: rule.label,
      actionType: "CLAMP_MUSCLE",
      matchedConditions: rule.trigger_conditions_json,
      specificity: computeSpecificity(rule),
      priority: rule.priority,
      winnerReason: clampCandidates.length === 1
        ? "only match"
        : winnerReason(rule, clampCandidates.filter((r) => r.id !== rule.id)),
    });
  }

  return { effectiveMotionId, deltaOverrides, clampMap, rulesFired };
}
