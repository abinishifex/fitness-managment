/**
 * AI Output Contract (Backend Spec, Section 8)
 *
 * Locked shared schema for AI Decision Engine responses.
 * Both Dev1 (plan generation) and Dev2 (gateway / decision engine) import this.
 *
 * Shape mirrors WorkoutPlan.days[].exercises[] fields + top-level `reason`
 * (stored as WorkoutPlan.aiReason / AiDecision.rawOutput), extended with GymAI
 * research columns: formCue, progressionCue, substitutionNote.
 */
const { z } = require('zod');

const ADJUSTMENT_ACTIONS = ['KEEP', 'SWAP', 'ADD', 'REMOVE'];

const dayOfWeekSchema = z.union([
  z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]),
  z.number().int().min(1).max(7),
  z.coerce.number().int().min(1).max(7),
]);

/** AI often returns numbers as strings — coerce before range checks. */
function optionalCoercedNumber(schema) {
  return z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return value;
  }, schema.optional());
}

/**
 * One exercise-level adjustment the AI proposes against a candidate (rules) plan.
 * Maps to plan UI columns (GymAI research Part 3):
 *   Exercise (+ formCue), Sets x Reps, Rest, RPE, progressionCue, substitutionNote
 */
const adjustmentSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    exerciseId: z.string().min(1),
    /** For SWAP: the exercise being replaced (optional but recommended). */
    replaceExerciseId: z.string().min(1).optional(),
    action: z.enum(ADJUSTMENT_ACTIONS),
    sets: z.coerce.number().int().positive().max(20),
    reps: z.string().min(1).max(32), // e.g. "8-12" or "4 x 6-8" display uses sets x reps
    /** One-line form cue shown under the exercise name. */
    formCue: z.string().min(1).max(200).optional(),
    /**
     * RPE target 1–10 (Part 2B). Shown every row so the member self-regulates.
     * Coerces "8" → 8 because models often emit numeric strings.
     */
    rpe: optionalCoercedNumber(z.coerce.number().min(1).max(10)),
    /** Rest in seconds — Part 2B table (compound vs isolation). */
    restSeconds: optionalCoercedNumber(
      z.coerce.number().int().nonnegative().max(600)
    ),
    /**
     * Load/progression cue (Part 3) — no 1RM required.
     * e.g. "Increase weight next session if you hit the top of the rep range with 1–2 RIR."
     */
    progressionCue: z.string().min(1).max(300).optional(),
    /**
     * Only when an injury/limitation triggered a swap (Part 3).
     * e.g. "Landmine Press used in place of Overhead Press (shoulder note)."
     */
    substitutionNote: z.string().min(1).max(300).optional(),
  })
  .strict();

const aiOutputContractSchema = z
  .object({
    /** Human-readable coaching rationale — maps to WorkoutPlan.aiReason */
    reason: z.string().min(1).max(2000),
    /**
     * Optional: week flagged as deload (Part 4 scheduling rule).
     * Backend may also set this without the model — accepted when present.
     */
    isDeloadWeek: z.boolean().optional(),
    /** Ordered list of KEEP/SWAP/ADD/REMOVE ops against the candidate plan */
    adjustments: z.array(adjustmentSchema).min(1).max(100),
  })
  .strict();

/**
 * Validate raw AI JSON against the contract.
 * @returns {{ success: true, data } | { success: false, error: ZodError }}
 */
function parseAiOutput(raw) {
  return aiOutputContractSchema.safeParse(raw);
}

/**
 * JSON Schema (draft-07-ish) mirror for providers that accept response_format.json_schema.
 * Keep in sync with the Zod schema above.
 */
const aiOutputJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://fitness-mgt.local/schemas/ai-output-contract.json',
  title: 'AI Output Contract',
  type: 'object',
  additionalProperties: false,
  required: ['reason', 'adjustments'],
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 2000 },
    isDeloadWeek: { type: 'boolean' },
    adjustments: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dayOfWeek', 'exerciseId', 'action', 'sets', 'reps'],
        properties: {
          dayOfWeek: {
            oneOf: [
              {
                type: 'string',
                enum: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ],
              },
              { type: 'integer', minimum: 1, maximum: 7 },
            ],
          },
          exerciseId: { type: 'string', minLength: 1 },
          replaceExerciseId: { type: 'string', minLength: 1 },
          action: { type: 'string', enum: ADJUSTMENT_ACTIONS },
          sets: { type: 'integer', minimum: 1, maximum: 20 },
          reps: { type: 'string', minLength: 1, maxLength: 32 },
          formCue: { type: 'string', minLength: 1, maxLength: 200 },
          rpe: { type: 'number', minimum: 1, maximum: 10 },
          restSeconds: { type: 'integer', minimum: 0, maximum: 600 },
          progressionCue: { type: 'string', minLength: 1, maxLength: 300 },
          substitutionNote: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
  },
};

module.exports = {
  ADJUSTMENT_ACTIONS,
  dayOfWeekSchema,
  adjustmentSchema,
  aiOutputContractSchema,
  aiOutputJsonSchema,
  parseAiOutput,
};
