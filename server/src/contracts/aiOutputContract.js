/**
 * AI Output Contract (Backend Spec, Section 8)
 *
 * Locked shared schema for AI Decision Engine responses.
 * Both Dev1 (plan generation) and Dev2 (gateway / decision engine) import this.
 *
 * Shape mirrors WorkoutPlan.days[].exercises[] fields + top-level `reason`
 * (stored as WorkoutPlan.aiReason / AiDecision.rawOutput).
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
]);

/**
 * One exercise-level adjustment the AI proposes against a candidate (rules) plan.
 * exerciseId is a string ObjectId — catalogue membership is enforced by the
 * Safety Validator later, not by this shape contract.
 */
const adjustmentSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    exerciseId: z.string().min(1),
    /** For SWAP: the exercise being replaced (optional but recommended). */
    replaceExerciseId: z.string().min(1).optional(),
    action: z.enum(ADJUSTMENT_ACTIONS),
    sets: z.number().int().positive().max(20),
    reps: z.string().min(1).max(32), // e.g. "8-12" or "10"
    rpe: z.number().min(1).max(10).optional(),
    restSeconds: z.number().int().nonnegative().max(600).optional(),
  })
  .strict();

const aiOutputContractSchema = z
  .object({
    /** Human-readable coaching rationale — maps to WorkoutPlan.aiReason */
    reason: z.string().min(1).max(2000),
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
          rpe: { type: 'number', minimum: 1, maximum: 10 },
          restSeconds: { type: 'integer', minimum: 0, maximum: 600 },
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
