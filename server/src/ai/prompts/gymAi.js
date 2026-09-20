/**
 * GymAI — Exercise Science research prompts.
 *
 * Encodes intake → split / sets-reps-rest-RPE / volume / injury substitution
 * rules used by the AI Gateway request (system + user prompt).
 */

const GOAL_PRESCRIPTION = {
  strength: {
    reps: '1-6 (main lifts)',
    setsPerExercise: '3-5',
    rest: '180-300s compounds',
    rpe: '8-10',
  },
  muscle_gain: {
    reps: '6-12 primary (ok 5-20)',
    setsPerExercise: '3-4',
    rest: '60-90s isolation, 120-180s compounds',
    rpe: '7-9',
  },
  fat_loss: {
    reps: '8-15',
    setsPerExercise: '3-4',
    rest: '45-75s',
    rpe: '7-9',
  },
  general_fitness: {
    reps: '12-20+',
    setsPerExercise: '2-3',
    rest: '30-60s',
    rpe: '6-8',
  },
};

/**
 * Research-backed system prompt (Parts 2–4).
 * Response shape stays Section 8 AI Output Contract.
 */
const GYMAI_SYSTEM_PROMPT = [
  'You are GymAI, a strength-training decision engine for a gym personal trainer platform.',
  'Respond with a SINGLE JSON object only (no markdown) matching the AI Output Contract:',
  '{',
  '  "reason": string,',
  '  "isDeloadWeek": boolean (optional),',
  '  "adjustments": [{',
  '    "dayOfWeek", "exerciseId", "replaceExerciseId?", "action",',
  '    "sets", "reps", "formCue?", "rpe", "restSeconds",',
  '    "progressionCue?", "substitutionNote?"',
  '  }]',
  '}.',
  'action must be KEEP | SWAP | ADD | REMOVE.',
  'Use ONLY exercise IDs supplied in the user prompt. Numbers must be JSON numbers (rpe, sets, restSeconds) not strings.',
  '',
  'SPLIT SELECTION (when preferredSplit is "let_ai_decide" or missing):',
  '- 2–3 days/week → full_body (each muscle 2–3x/week).',
  '- 4 days/week → upper_lower (standard intermediate).',
  '- 5–6 days/week → push_pull_legs (PPL twice at 6 days).',
  '- Exception: trainingExperience=beginner → prefer full_body even at 4 days (motor learning > volume).',
  '',
  'SETS / REPS / REST / RPE BY GOAL (populate every adjustment row):',
  '- strength: reps 1–6 main lifts, sets 3–5, rest 3–5 min compounds, RPE 8–10.',
  '- muscle_gain (hypertrophy): reps 6–12 (ok 5–20), sets 3–4, rest 60–90s isolation / 2–3 min compounds, RPE 7–9.',
  '- fat_loss: reps 8–15, sets 3–4, rest 45–75s, RPE 7–9.',
  '- general_fitness / endurance: reps 12–20+, sets 2–3, rest 30–60s, RPE 6–8.',
  'Do NOT artificially shorten rest "for the burn" — protect performance and weekly volume.',
  'Proximity to failure (RPE/RIR) matters more than exact rep count — include rpe on EVERY row.',
  '',
  'WEEKLY VOLUME: aim 10–20 total sets per muscle group per week, split across ≥2 sessions when schedule allows.',
  'If priorityMuscleGroup is set, allocate extra sets to that muscle instead of even distribution.',
  'If cardioInclusion is true, add conditioning alongside lifting without replacing primary compound volume.',
  'Age: older lifters → more recovery between hard sessions and more warm-up volume before heavy compounds.',
  '',
  'INJURIES / LIMITATIONS: SUBSTITUTE, do not only warn. Examples:',
  '- Shoulder impingement: Overhead Press → Landmine Press (set substitutionNote).',
  '- Lower back: Back Squat → Leg Press or Belt Squat.',
  '- Knee pain: Leg Extension → reduced ROM, Wall Sit, or Step-up.',
  'Always set substitutionNote when a swap was injury-driven.',
  '',
  'OUTPUT COLUMNS (every KEEP/SWAP/ADD row):',
  '- formCue: one-line technique cue.',
  '- sets + reps: display as Sets x Reps (e.g. sets 4, reps "6-8").',
  '- restSeconds + rpe: from the goal table (compound vs isolation for rest).',
  '- progressionCue: text like "Increase weight next session if you hit the top of the rep range with 1–2 reps in reserve." (no 1RM prescription).',
  '',
  'DELOAD: if weekNumber is a multiple of 5 (or intake marks deload), set isDeloadWeek true and cut volume/intensity ~40–60% for that week.',
].join('\n');

/**
 * Normalize intake aliases from the form / MemberProfile.
 * @param {Record<string, unknown>} intake
 */
function normalizeIntake(intake = {}) {
  const goalAliases = {
    'build muscle': 'muscle_gain',
    hypertrophy: 'muscle_gain',
    'fat loss': 'fat_loss',
    recomposition: 'fat_loss',
    endurance: 'general_fitness',
    'general fitness': 'general_fitness',
  };

  const rawGoal = String(intake.fitnessGoal || intake.primaryGoal || '')
    .trim()
    .toLowerCase();
  const fitnessGoal =
    goalAliases[rawGoal] ||
    (['muscle_gain', 'fat_loss', 'general_fitness', 'strength'].includes(rawGoal)
      ? rawGoal
      : 'muscle_gain');

  return {
    age: intake.age,
    sex: intake.sex,
    fitnessGoal,
    trainingExperience: intake.trainingExperience || intake.experience,
    trainingDaysPerWeek: intake.trainingDaysPerWeek || intake.daysPerWeek,
    sessionDurationMinutes:
      intake.sessionDurationMinutes || intake.sessionLength,
    equipmentAvailable: intake.equipmentAvailable || intake.equipment || [],
    preferredSplit: intake.preferredSplit || 'let_ai_decide',
    priorityMuscleGroup: intake.priorityMuscleGroup || null,
    cardioInclusion: Boolean(intake.cardioInclusion),
    limitations: intake.limitations || intake.injuries || [],
    weekNumber: intake.weekNumber || 1,
  };
}

/**
 * Recommend split label for the prompt (Part 2A) — Decision Engine may override.
 */
function recommendSplit(intake) {
  const days = Number(intake.trainingDaysPerWeek) || 3;
  const experience = String(intake.trainingExperience || 'beginner').toLowerCase();
  const preferred = String(intake.preferredSplit || 'let_ai_decide').toLowerCase();

  if (preferred && preferred !== 'let_ai_decide') {
    return preferred;
  }
  if (experience === 'beginner') return 'full_body';
  if (days <= 3) return 'full_body';
  if (days === 4) return 'upper_lower';
  return 'push_pull_legs';
}

/**
 * Map a MemberProfile (or lean doc) into GymAI intake fields.
 *
 * @param {Record<string, unknown>} profile
 * @param {{ weekNumber?: number, preferredSplit?: string, cardioInclusion?: boolean }} [overrides]
 */
function profileToIntake(profile = {}, overrides = {}) {
  return normalizeIntake({
    age: profile.age,
    sex: profile.sex,
    fitnessGoal: profile.fitnessGoal,
    trainingExperience: profile.trainingExperience,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    sessionDurationMinutes: profile.sessionDurationMinutes,
    equipmentAvailable: profile.equipmentAvailable,
    priorityMuscleGroup: profile.priorityMuscleGroup,
    limitations: profile.limitations,
    weekNumber: overrides.weekNumber,
    preferredSplit: overrides.preferredSplit,
    cardioInclusion: overrides.cardioInclusion,
  });
}

/**
 * Flatten Exercise docs / seed rows into catalogue entries the model may cite.
 *
 * @param {Array<Record<string, unknown>>} exercises
 */
function normalizeCatalog(exercises = []) {
  return (exercises || []).map((ex) => {
    const id = String(ex.id || ex._id || ex.exerciseId || '');
    const primary =
      (Array.isArray(ex.primaryMuscles) && ex.primaryMuscles[0]) ||
      ex.muscleGroup ||
      null;
    const equipment = Array.isArray(ex.equipmentRequired)
      ? ex.equipmentRequired
      : ex.equipment
        ? [ex.equipment]
        : [];

    return {
      id,
      name: ex.name || ex.slug || id,
      muscleGroup: primary,
      primaryMuscles: ex.primaryMuscles || (primary ? [primary] : []),
      equipment,
      movementPattern: ex.movementPattern || null,
      type: ex.type || null,
      difficulty: ex.difficulty || null,
      contraindications: ex.contraindications || [],
    };
  });
}

/**
 * Compact recent WorkoutLog rows for the prompt (most recent first, capped).
 *
 * @param {Array<Record<string, unknown>>} logs
 * @param {{ limit?: number }} [opts]
 */
function summarizeHistory(logs = [], { limit = 20 } = {}) {
  return (logs || []).slice(0, limit).map((log) => {
    const sets = (log.setsCompleted || []).map((s) => ({
      set: s.setNumber,
      reps: s.reps,
      weightKg: s.weightKg,
    }));
    return {
      dayOfWeek: log.dayOfWeek,
      exerciseId: String(log.exerciseId || ''),
      setsCompleted: sets,
      sessionCompleted: Boolean(log.sessionCompleted),
      at: log.clientTimestamp || log.createdAt || null,
    };
  });
}

/**
 * Build the user prompt for generateCompletion from intake + catalogue + candidate plan.
 *
 * @param {{
 *   intake: Record<string, unknown>,
 *   catalogue?: Array<{ id: string, name: string, equipment?: string|string[], muscleGroup?: string, movementPattern?: string }>,
 *   candidatePlan?: unknown,
 *   history?: unknown,
 *   extraInstructions?: string,
 * }} args
 * @returns {string}
 */
function buildAiRequestPrompt({
  intake,
  catalogue = [],
  candidatePlan = null,
  history = null,
  extraInstructions = '',
} = {}) {
  const normalized = normalizeIntake(intake);
  const split = recommendSplit(normalized);
  const prescription =
    GOAL_PRESCRIPTION[normalized.fitnessGoal] || GOAL_PRESCRIPTION.muscle_gain;
  const isDeload = Number(normalized.weekNumber) > 0 && Number(normalized.weekNumber) % 5 === 0;

  const lines = [
    'INTAKE (form):',
    JSON.stringify(normalized, null, 2),
    '',
    `Suggested split (Part 2A): ${split}`,
    `Goal prescription defaults (Part 2B): ${JSON.stringify(prescription)}`,
    `Weekly volume target: 10–20 sets/muscle/week; priorityMuscleGroup=${normalized.priorityMuscleGroup || 'none'}`,
    `Week number: ${normalized.weekNumber}${isDeload ? ' → treat as DELOAD week (~40–60% volume/intensity cut)' : ''}`,
    '',
    'APPROVED EXERCISE CATALOGUE (use only these exerciseId values):',
    JSON.stringify(catalogue, null, 2),
    '',
    'CANDIDATE PLAN (rules engine draft — adjust with KEEP/SWAP/ADD/REMOVE):',
    JSON.stringify(candidatePlan, null, 2),
  ];

  if (history != null) {
    lines.push(
      '',
      'RECENT WORKOUT HISTORY (most recent first — use for progression / deload cues):',
      JSON.stringify(history, null, 2)
    );
  }

  lines.push(
    '',
    'Return AI Output Contract JSON. Include rpe + restSeconds + formCue + progressionCue on each row; set substitutionNote for injury-driven swaps.'
  );

  if (extraInstructions) {
    lines.push('', extraInstructions);
  }

  return lines.join('\n');
}

/**
 * Day 3 prompt builder: profile + history + catalog + rules → structured prompt.
 *
 * `rules` is the deterministic rules-engine draft (candidate plan). Dev1 owns
 * that engine; Dev2 only serializes it into the AI request.
 *
 * @param {{
 *   profile: Record<string, unknown>,
 *   history?: Array<Record<string, unknown>>,
 *   catalog?: Array<Record<string, unknown>>,
 *   rules?: unknown,
 *   weekNumber?: number,
 *   preferredSplit?: string,
 *   cardioInclusion?: boolean,
 *   extraInstructions?: string,
 * }} args
 * @returns {{ prompt: string, intake: Record<string, unknown>, catalogue: object[], historySummary: object[] }}
 */
function buildStructuredPrompt({
  profile,
  history = [],
  catalog = [],
  rules = null,
  weekNumber,
  preferredSplit,
  cardioInclusion,
  extraInstructions = '',
} = {}) {
  if (!profile || typeof profile !== 'object') {
    const err = new Error('buildStructuredPrompt requires a member profile');
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }

  const intake = profileToIntake(profile, {
    weekNumber,
    preferredSplit,
    cardioInclusion,
  });
  const catalogue = normalizeCatalog(catalog);
  const historySummary = summarizeHistory(history);

  const prompt = buildAiRequestPrompt({
    intake,
    catalogue,
    candidatePlan: rules,
    history: historySummary,
    extraInstructions,
  });

  return { prompt, intake, catalogue, historySummary };
}

module.exports = {
  GYMAI_SYSTEM_PROMPT,
  GOAL_PRESCRIPTION,
  normalizeIntake,
  recommendSplit,
  profileToIntake,
  normalizeCatalog,
  summarizeHistory,
  buildAiRequestPrompt,
  buildStructuredPrompt,
};
