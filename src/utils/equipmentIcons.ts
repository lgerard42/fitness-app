/**
 * Helper to convert base64 icon from database into React Native Image source.
 * Equipment icons are only from the gym_equipment table (icon column, base64 from equipmentIcons.json).
 * Do not add hard-coded fallbacks here; all icon data comes from the table.
 */
export function getEquipmentIconSource(
  iconBase64: string | null | undefined
): { uri: string } | null {
  if (!iconBase64 || typeof iconBase64 !== 'string') return null;
  return { uri: 'data:image/png;base64,' + iconBase64 };
}
