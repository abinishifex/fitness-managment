/**
 * Shared muscle-group options and helpers.
 * Imported by both onboarding and profile pages.
 */

export const MUSCLE_OPTIONS = [
  { value: 'chest',      label: 'Chest' },
  { value: 'back',       label: 'Back' },
  { value: 'lats',       label: 'Lats' },
  { value: 'upper_back', label: 'Upper back' },
  { value: 'shoulders',  label: 'Shoulders' },
  { value: 'side_delts', label: 'Side delts' },
  { value: 'rear_delts', label: 'Rear delts' },
  { value: 'traps',      label: 'Traps' },
  { value: 'biceps',     label: 'Biceps' },
  { value: 'triceps',    label: 'Triceps' },
  { value: 'forearms',   label: 'Forearms' },
  { value: 'core',       label: 'Core' },
  { value: 'glutes',     label: 'Glutes' },
  { value: 'quads',      label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'calves',     label: 'Calves' },
] as const;

export type MuscleValue = (typeof MUSCLE_OPTIONS)[number]['value'];

const VALID_MUSCLE_VALUES: readonly string[] = MUSCLE_OPTIONS.map((o) => o.value);

/**
 * Parse a stored priorityMuscleGroup string into a validated array of
 * known option values. Handles free-text from older profiles gracefully
 * (tokens not in the list are silently dropped, never crashes).
 *
 * @example
 *   parseMuscleGroupString("chest,triceps")  // → ["chest", "triceps"]
 *   parseMuscleGroupString("Arms")           // → []  (unknown token dropped)
 *   parseMuscleGroupString(undefined)        // → []
 */
export function parseMuscleGroupString(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => VALID_MUSCLE_VALUES.includes(s));
}
