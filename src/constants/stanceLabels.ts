/**
 * Stance type display labels from option id (see STANCE_TYPES in data.js).
 * Returns { main: label, sub?: sublabel } for use in picker, button label, etc.
 */
import { STANCE_TYPES_BY_ID } from './data';

export function getStanceLabel(id: string): { main: string; sub?: string } {
  const option = STANCE_TYPES_BY_ID[id];
  if (!option) return { main: id };
  return { main: option.label, sub: option.sublabel };
}
