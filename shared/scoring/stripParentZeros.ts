/**
 * Strip parent muscle IDs that have score 0 from a flat score map.
 * Parent totals are computed dynamically from children at display time,
 * so storing parent IDs with 0 is redundant.
 *
 * @param flat - Record of muscleId -> score
 * @param parentIds - Set of muscle IDs that are parents (appear in some muscle's parent_ids)
 * @returns New object with entries where (parent and score === 0) are omitted
 */
export function stripParentZerosFromFlatScores(
  flat: Record<string, number>,
  parentIds: Set<string>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [muscleId, score] of Object.entries(flat)) {
    if (parentIds.has(muscleId) && score === 0) continue;
    out[muscleId] = score;
  }
  return out;
}
