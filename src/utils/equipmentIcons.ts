/**
 * Helper to convert base64 icon from database into React Native Image source.
 * Icons are stored as base64 in gym_equipment.icon column.
 */
export function getEquipmentIconSource(
  iconBase64: string | null | undefined
): { uri: string } | null {
  if (!iconBase64 || typeof iconBase64 !== 'string') return null;
  return { uri: 'data:image/png;base64,' + iconBase64 };
}
