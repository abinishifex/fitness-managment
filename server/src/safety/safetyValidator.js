/**
 * Safety Validation Engine (Day 2 start → Day 4 finish).
 *
 * Architecture: AI recommends; backend rules validate.
 * Checks: equipment, isApproved, volume limits, session-duration
 * realism, limitation / contraindication conflicts.
 */

/** Research target is 10–20 sets/muscle/week; hard cap allows priority bias. */
const MAX_WEEKLY_SETS_PER_MUSCLE = 25;

/** Working-set caps per session by experience (prevents unrealistic density). */
const MAX_SESSION_SETS = {
  beginner: 20,
  intermediate: 28,
  advanced: 35,
};

const SECONDS_PER_SET_WORK = 45;
const DEFAULT_REST_COMPOUND_SEC = 120;
const DEFAULT_REST_ISOLATION_SEC = 75;
const WARMUP_BUFFER_SEC = 5 * 60;
/** Allow ~10% over the member's stated session length. */
const SESSION_DURATION_TOLERANCE = 1.1;

const LIMITATION_STOP_WORDS = new Set([
  'acute',
  'fresh',
  'pain',
  'flare',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'with',
  'uncontrolled',
  'irritation',
  'disorder',
  'disorders',
]);

/**
 * @typedef {object} ExerciseLike
 * @property {string} [_id]
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [slug]
 * @property {boolean} [isApproved]
 * @property {string[]} [equipmentRequired]
 * @property {string[]} [contraindications]
 * @property {string[]} [primaryMuscles]
 * @property {string} [type]
 */

/**
 * @typedef {object} SafetyIssue
 * @property {'equipment'|'not_approved'|'volume'|'session_duration'|'limitation'|'unknown_exercise'} code
 * @property {string} message
 * @property {string} [exerciseId]
 * @property {string[]} [missingEquipment]
 * @property {string} [muscle]
 * @property {number} [sets]
 * @property {number} [limit]
 * @property {string} [limitation]
 * @property {string} [contraindication]
 * @property {number} [estimatedMinutes]
 * @property {number} [budgetMinutes]
 * @property {string|number} [dayOfWeek]
 */

/**
 * Every required equipment item must be present in the member's available list.
 * Treat `none` as always satisfied (no physical gear needed).
 *
 * @param {ExerciseLike} exercise
 * @param {string[]} equipmentAvailable
 * @returns {SafetyIssue[]}
 */
function checkEquipment(exercise, equipmentAvailable = []) {
  const available = new Set(
    (equipmentAvailable || []).map((item) => String(item).toLowerCase())
  );
  const required = (exercise.equipmentRequired || []).map((item) =>
    String(item).toLowerCase()
  );

  const missing = required.filter((item) => {
    if (item === 'none') return false;
    return !available.has(item);
  });

  if (missing.length === 0) return [];

  return [
    {
      code: 'equipment',
      message: `Exercise "${exercise.name || exercise.slug || exercise._id}" requires equipment not available: ${missing.join(', ')}`,
      exerciseId: String(exercise._id || exercise.id || ''),
      missingEquipment: missing,
    },
  ];
}

/**
 * AI / plan generation may only select exercises with isApproved === true.
 *
 * @param {ExerciseLike} exercise
 * @returns {SafetyIssue[]}
 */
function checkApproved(exercise) {
  if (exercise.isApproved === true) return [];

  return [
    {
      code: 'not_approved',
      message: `Exercise "${exercise.name || exercise.slug || exercise._id}" is not approved for programming`,
      exerciseId: String(exercise._id || exercise.id || ''),
    },
  ];
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function tokenizeLimitation(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !LIMITATION_STOP_WORDS.has(token));
}

/**
 * True when a member limitation conflicts with an exercise contraindication.
 * Matches full-phrase containment or meaningful token overlap.
 *
 * @param {string} limitation
 * @param {string} contraindication
 */
function limitationConflicts(limitation, contraindication) {
  const lim = String(limitation || '')
    .toLowerCase()
    .trim();
  const con = String(contraindication || '')
    .toLowerCase()
    .trim();
  if (!lim || !con) return false;
  if (lim.includes(con) || con.includes(lim)) return true;

  const limTokens = tokenizeLimitation(lim);
  const conTokens = new Set(tokenizeLimitation(con));
  const overlap = limTokens.filter((token) => conTokens.has(token));

  if (overlap.length >= 2) return true;
  // Single anatomical / condition token (e.g. "shoulder", "knee", "impingement")
  if (overlap.length === 1 && overlap[0].length >= 4) return true;
  return false;
}

/**
 * Member limitations must not conflict with exercise contraindications.
 *
 * @param {ExerciseLike} exercise
 * @param {string[]} limitations
 * @returns {SafetyIssue[]}
 */
function checkLimitations(exercise, limitations = []) {
  const notes = exercise.contraindications || [];
  if (!limitations?.length || !notes.length) return [];

  const issues = [];
  const exerciseId = String(exercise._id || exercise.id || '');
  const label = exercise.name || exercise.slug || exerciseId;

  for (const limitation of limitations) {
    for (const contraindication of notes) {
      if (!limitationConflicts(limitation, contraindication)) continue;
      issues.push({
        code: 'limitation',
        message: `Exercise "${label}" conflicts with limitation "${limitation}" (contraindication: ${contraindication})`,
        exerciseId,
        limitation: String(limitation),
        contraindication: String(contraindication),
      });
    }
  }

  return issues;
}

/**
 * @param {Array<ExerciseLike|Record<string, unknown>>} catalog
 * @returns {Map<string, ExerciseLike>}
 */
function indexCatalog(catalog = []) {
  const map = new Map();
  for (const ex of catalog || []) {
    const id = String(ex._id || ex.id || ex.exerciseId || '');
    if (id) map.set(id, ex);
  }
  return map;
}

/**
 * Estimate seconds for one programmed exercise row.
 *
 * @param {{ sets?: number, restSeconds?: number, action?: string }} row
 * @param {ExerciseLike} [catalogEntry]
 */
function estimateExerciseSeconds(row, catalogEntry) {
  if (row?.action === 'REMOVE') return 0;
  const sets = Number(row?.sets) || 0;
  if (sets <= 0) return 0;

  const defaultRest =
    catalogEntry?.type === 'isolation'
      ? DEFAULT_REST_ISOLATION_SEC
      : DEFAULT_REST_COMPOUND_SEC;
  const rest =
    row.restSeconds != null && row.restSeconds !== ''
      ? Number(row.restSeconds)
      : defaultRest;
  const restSec = Number.isFinite(rest) ? Math.max(0, rest) : defaultRest;

  return sets * SECONDS_PER_SET_WORK + Math.max(0, sets - 1) * restSec;
}

/**
 * Session must fit within the member's stated duration (with small tolerance).
 *
 * @param {{ dayOfWeek?: string|number, exercises?: Array<Record<string, unknown>> }} day
 * @param {number} sessionDurationMinutes
 * @param {Map<string, ExerciseLike>} catalogById
 * @returns {SafetyIssue[]}
 */
function checkSessionDuration(day, sessionDurationMinutes, catalogById) {
  const budgetMinutes = Number(sessionDurationMinutes);
  if (!Number.isFinite(budgetMinutes) || budgetMinutes <= 0) return [];

  let totalSec = WARMUP_BUFFER_SEC;
  for (const row of day.exercises || []) {
    const id = String(row.exerciseId || row._id || row.id || '');
    totalSec += estimateExerciseSeconds(row, catalogById.get(id));
  }

  const budgetSec = budgetMinutes * 60;
  if (totalSec <= budgetSec * SESSION_DURATION_TOLERANCE) return [];

  const estimatedMinutes = Math.ceil(totalSec / 60);
  return [
    {
      code: 'session_duration',
      message: `Day ${day.dayOfWeek ?? '?'} estimated ~${estimatedMinutes} min exceeds session budget of ${budgetMinutes} min`,
      dayOfWeek: day.dayOfWeek,
      estimatedMinutes,
      budgetMinutes,
    },
  ];
}

/**
 * Weekly per-muscle set caps + per-session set density caps.
 *
 * @param {Array<{ dayOfWeek?: string|number, exercises?: Array<Record<string, unknown>> }>} days
 * @param {Map<string, ExerciseLike>} catalogById
 * @param {{
 *   weeklyVolumeTarget?: Record<string, number>|unknown,
 *   trainingExperience?: string,
 *   maxWeeklySetsPerMuscle?: number,
 * }} [opts]
 * @returns {SafetyIssue[]}
 */
function checkVolume(days, catalogById, opts = {}) {
  const maxWeekly =
    opts.maxWeeklySetsPerMuscle ?? MAX_WEEKLY_SETS_PER_MUSCLE;
  const experience = String(opts.trainingExperience || 'intermediate').toLowerCase();
  const sessionCap =
    MAX_SESSION_SETS[experience] || MAX_SESSION_SETS.intermediate;
  const target =
    opts.weeklyVolumeTarget &&
    typeof opts.weeklyVolumeTarget === 'object' &&
    !Array.isArray(opts.weeklyVolumeTarget)
      ? opts.weeklyVolumeTarget
      : null;

  const weeklyCounts = Object.create(null);
  const issues = [];

  for (const day of days || []) {
    let sessionSets = 0;

    for (const row of day.exercises || []) {
      if (row.action === 'REMOVE') continue;
      const sets = Number(row.sets) || 0;
      if (sets <= 0) continue;
      sessionSets += sets;

      const id = String(row.exerciseId || row._id || row.id || '');
      const entry = catalogById.get(id);
      const muscles = entry?.primaryMuscles || [];
      for (const muscle of muscles) {
        const key = String(muscle).toLowerCase();
        weeklyCounts[key] = (weeklyCounts[key] || 0) + sets;
      }
    }

    if (sessionSets > sessionCap) {
      issues.push({
        code: 'volume',
        message: `Day ${day.dayOfWeek ?? '?'} has ${sessionSets} working sets (limit ${sessionCap} for ${experience})`,
        dayOfWeek: day.dayOfWeek,
        sets: sessionSets,
        limit: sessionCap,
      });
    }
  }

  for (const [muscle, sets] of Object.entries(weeklyCounts)) {
    let limit = maxWeekly;
    if (target && target[muscle] != null) {
      const t = Number(target[muscle]);
      if (Number.isFinite(t) && t > 0) {
        // Allow modest overrun vs the plan's own target, still bounded by hard max.
        limit = Math.min(maxWeekly, Math.ceil(t * 1.5));
      }
    }
    if (sets > limit) {
      issues.push({
        code: 'volume',
        message: `Weekly volume for ${muscle} is ${sets} sets (limit ${limit})`,
        muscle,
        sets,
        limit,
      });
    }
  }

  return issues;
}

/**
 * Validate one exercise against approval, equipment, and limitations.
 *
 * @param {ExerciseLike} exercise
 * @param {{ equipmentAvailable?: string[], limitations?: string[] }} [context]
 */
function validateExercise(exercise, context = {}) {
  const issues = [
    ...checkApproved(exercise),
    ...checkEquipment(exercise, context.equipmentAvailable || []),
    ...checkLimitations(exercise, context.limitations || []),
  ];

  return {
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Validate a list of exercises (e.g. a candidate plan day or AI adjustment set).
 *
 * @param {ExerciseLike[]} exercises
 * @param {{ equipmentAvailable?: string[], limitations?: string[] }} [context]
 */
function validateExercises(exercises, context = {}) {
  const issues = [];
  for (const exercise of exercises || []) {
    issues.push(...validateExercise(exercise, context).issues);
  }
  return {
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Normalize AI adjustments into plan-day shape for volume / duration checks.
 *
 * @param {Array<Record<string, unknown>>} adjustments
 */
function adjustmentsToDays(adjustments = []) {
  /** @type {Map<string|number, Array<Record<string, unknown>>>} */
  const byDay = new Map();
  for (const row of adjustments || []) {
    const key = row.dayOfWeek ?? '?';
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(row);
  }
  return [...byDay.entries()].map(([dayOfWeek, exercises]) => ({
    dayOfWeek,
    exercises,
  }));
}

/**
 * Full-plan gate used before any WorkoutPlan is saved.
 *
 * Accepts a WorkoutPlan-shaped `{ days, ... }` or `{ adjustments }` (AI output).
 *
 * @param {Record<string, unknown>} plan
 * @param {{
 *   catalog?: ExerciseLike[],
 *   equipmentAvailable?: string[],
 *   limitations?: string[],
 *   sessionDurationMinutes?: number,
 *   trainingExperience?: string,
 *   weeklyVolumeTarget?: Record<string, number>,
 * }} [context]
 */
function validatePlan(plan = {}, context = {}) {
  const catalog = context.catalog || [];
  const catalogById = indexCatalog(catalog);
  const equipmentAvailable =
    context.equipmentAvailable || plan.equipmentAvailable || [];
  const limitations = context.limitations || plan.limitations || [];
  const sessionDurationMinutes =
    context.sessionDurationMinutes ?? plan.sessionDurationMinutes;
  const trainingExperience =
    context.trainingExperience || plan.trainingExperience;
  const weeklyVolumeTarget =
    context.weeklyVolumeTarget || plan.weeklyVolumeTarget;

  const days =
    Array.isArray(plan.days) && plan.days.length > 0
      ? plan.days
      : adjustmentsToDays(plan.adjustments || []);

  const issues = [];

  for (const day of days) {
    for (const row of day.exercises || []) {
      if (row.action === 'REMOVE') continue;
      const id = String(row.exerciseId || row._id || row.id || '');
      const entry = catalogById.get(id);

      if (!entry) {
        issues.push({
          code: 'unknown_exercise',
          message: `Exercise id "${id}" is not in the approved catalogue`,
          exerciseId: id,
          dayOfWeek: day.dayOfWeek,
        });
        continue;
      }

      const merged = {
        ...entry,
        sets: row.sets,
        restSeconds: row.restSeconds,
        action: row.action,
      };
      issues.push(
        ...validateExercise(merged, { equipmentAvailable, limitations }).issues
      );
    }

    issues.push(
      ...checkSessionDuration(day, sessionDurationMinutes, catalogById)
    );
  }

  issues.push(
    ...checkVolume(days, catalogById, {
      weeklyVolumeTarget,
      trainingExperience,
    })
  );

  return {
    ok: issues.length === 0,
    issues,
  };
}

module.exports = {
  MAX_WEEKLY_SETS_PER_MUSCLE,
  MAX_SESSION_SETS,
  checkEquipment,
  checkApproved,
  checkLimitations,
  checkSessionDuration,
  checkVolume,
  limitationConflicts,
  estimateExerciseSeconds,
  indexCatalog,
  adjustmentsToDays,
  validateExercise,
  validateExercises,
  validatePlan,
};
