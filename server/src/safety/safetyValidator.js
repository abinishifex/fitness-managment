/**
 * Safety Validation Engine (Day 2 start).
 *
 * Architecture: AI recommends; backend rules validate.
 * This module begins with equipment availability and isApproved checks.
 * Volume / injury checks land in later Day 2–3 work.
 */

/**
 * @typedef {object} ExerciseLike
 * @property {string} [_id]
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [slug]
 * @property {boolean} [isApproved]
 * @property {string[]} [equipmentRequired]
 */

/**
 * @typedef {object} SafetyIssue
 * @property {'equipment'|'not_approved'} code
 * @property {string} message
 * @property {string} [exerciseId]
 * @property {string[]} [missingEquipment]
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
 * Validate one exercise against member equipment + approval flag.
 *
 * @param {ExerciseLike} exercise
 * @param {{ equipmentAvailable?: string[] }} [context]
 */
function validateExercise(exercise, context = {}) {
  const issues = [
    ...checkApproved(exercise),
    ...checkEquipment(exercise, context.equipmentAvailable || []),
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
 * @param {{ equipmentAvailable?: string[] }} [context]
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

module.exports = {
  checkEquipment,
  checkApproved,
  validateExercise,
  validateExercises,
};
