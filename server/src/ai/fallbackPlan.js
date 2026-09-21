/**
 * Deterministic fallback (Day 4 / Dev2)
 *
 * When the AI call fails, times out, or fails Day-1 contract validation,
 * return a rules-only WorkoutPlan draft with validatedBy: "system".
 *
 * Does not write WorkoutPlan — Dev1 Plan Generation owns persistence.
 * Always attempts to leave an AiDecision trail when the AI was invoked.
 */

const { runAiDecision } = require('./decisionEngine');
const { validatePlan } = require('../safety/safetyValidator');

const FALLBACK_REASON = {
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_ERROR: 'AI_ERROR',
  AI_CONTRACT_FAIL: 'AI_CONTRACT_FAIL',
};

/**
 * @param {unknown} err
 */
function isTimeoutError(err) {
  return (
    err?.code === 'AI_TIMEOUT' ||
    err?.status === 504 ||
    /timeout/i.test(String(err?.message || ''))
  );
}

/**
 * Normalize rules-engine candidate days into WorkoutPlan.days shape.
 *
 * @param {unknown} rules
 */
function normalizeRulesDays(rules = {}) {
  return (rules.days || []).map((day) => ({
    dayOfWeek: day.dayOfWeek,
    exercises: (day.exercises || []).map((ex) => ({
      exerciseId: ex.exerciseId,
      action: ex.action || 'KEEP',
      sets: ex.sets,
      reps: ex.reps,
      rpe: ex.rpe,
      restSeconds: ex.restSeconds,
    })),
  }));
}

/**
 * Build a rules-only plan draft (no Mongo write).
 *
 * @param {{
 *   memberId: string|import('mongoose').Types.ObjectId,
 *   rules: Record<string, unknown>,
 *   profile?: Record<string, unknown>,
 *   templateId?: string|import('mongoose').Types.ObjectId,
 *   aiDecisionId?: string|import('mongoose').Types.ObjectId,
 *   fallbackReason: string,
 *   fallbackMessage?: string,
 * }} args
 */
function buildRulesOnlyPlan({
  memberId,
  rules = {},
  profile = {},
  templateId,
  aiDecisionId,
  fallbackReason,
  fallbackMessage,
}) {
  if (!memberId) {
    const err = new Error('buildRulesOnlyPlan requires memberId');
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }
  if (!rules || !Array.isArray(rules.days)) {
    const err = new Error(
      'buildRulesOnlyPlan requires rules.days from the rules engine'
    );
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }

  const reason =
    fallbackMessage ||
    `Rules-only fallback (${fallbackReason}): AI unavailable; using deterministic candidate plan.`;

  return {
    memberId,
    templateId: templateId || rules.templateId,
    splitType: rules.splitType,
    trainingDaysPerWeek:
      profile.trainingDaysPerWeek ?? rules.trainingDaysPerWeek,
    sessionDurationMinutes:
      profile.sessionDurationMinutes ?? rules.sessionDurationMinutes,
    weeklyVolumeTarget: rules.weeklyVolumeTarget ?? {},
    days: normalizeRulesDays(rules),
    aiReason: reason,
    aiDecisionId: aiDecisionId || undefined,
    status: 'validated',
    validatedBy: 'system',
    isActive: false,
    source: 'rules_fallback',
    fallbackReason,
  };
}

/**
 * Try AI decision; on timeout / provider error / contract fail → rules-only plan.
 *
 * Success path returns AI result for Dev1 to merge adjustments.
 * Fallback path returns a system-validated rules-only draft + safety result.
 *
 * @param {{
 *   memberId: string|import('mongoose').Types.ObjectId,
 *   rules: Record<string, unknown>,
 *   profile?: Record<string, unknown>,
 *   history?: Array<Record<string, unknown>>,
 *   catalog?: Array<Record<string, unknown>>,
 *   templateId?: string|import('mongoose').Types.ObjectId,
 *   weekNumber?: number,
 *   preferredSplit?: string,
 *   cardioInclusion?: boolean,
 *   extraInstructions?: string,
 *   planId?: string|import('mongoose').Types.ObjectId,
 *   persist?: boolean,
 *   provider?: object,
 *   runDecision?: typeof runAiDecision,
 *   validate?: typeof validatePlan,
 *   [key: string]: unknown,
 * }} input
 */
async function runDecisionWithFallback(input = {}) {
  const {
    memberId,
    rules,
    profile = {},
    catalog = [],
    templateId,
    runDecision = runAiDecision,
    validate = validatePlan,
  } = input;

  if (!memberId) {
    const err = new Error('runDecisionWithFallback requires memberId');
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }
  if (!rules || !Array.isArray(rules.days)) {
    const err = new Error(
      'runDecisionWithFallback requires rules.days (rules-engine candidate)'
    );
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }

  /** @type {Awaited<ReturnType<typeof runAiDecision>>|undefined} */
  let ai;
  /** @type {string|null} */
  let fallbackReason = null;
  /** @type {string|null} */
  let fallbackMessage = null;

  try {
    ai = await runDecision(input);
    if (!ai.validationResult?.passed) {
      fallbackReason = FALLBACK_REASON.AI_CONTRACT_FAIL;
      fallbackMessage = `Rules-only fallback: AI output failed validation (${ai.validationResult?.reason || 'unknown'})`;
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      fallbackReason = FALLBACK_REASON.AI_TIMEOUT;
      fallbackMessage = `Rules-only fallback: AI timed out (${err.message})`;
    } else {
      fallbackReason = FALLBACK_REASON.AI_ERROR;
      fallbackMessage = `Rules-only fallback: AI call failed (${err.message})`;
    }
    ai = {
      decision: err.aiDecision || null,
      prompt: err.prompt || null,
      modelVersion: err.modelVersion || 'unknown',
      provider: err.provider || 'unknown',
      latencyMs: err.latencyMs || 0,
      rawOutput: err.rawOutput || {
        error: err.message,
        code: err.code,
        status: err.status,
      },
      parsed: null,
      validationResult:
        err.validationResult || {
          passed: false,
          reason: err.message,
        },
    };
  }

  if (!fallbackReason) {
    return {
      source: 'ai',
      usedFallback: false,
      validatedBy: 'system',
      fallbackReason: null,
      ai,
      planDraft: null,
      safety: null,
    };
  }

  const planDraft = buildRulesOnlyPlan({
    memberId,
    rules,
    profile,
    templateId,
    aiDecisionId: ai?.decision?._id,
    fallbackReason,
    fallbackMessage,
  });

  const safety = validate(planDraft, {
    catalog,
    equipmentAvailable: profile.equipmentAvailable || [],
    limitations: profile.limitations || [],
    sessionDurationMinutes:
      profile.sessionDurationMinutes ?? planDraft.sessionDurationMinutes,
    trainingExperience: profile.trainingExperience,
    weeklyVolumeTarget: planDraft.weeklyVolumeTarget,
  });

  return {
    source: 'rules_fallback',
    usedFallback: true,
    validatedBy: 'system',
    fallbackReason,
    ai,
    planDraft,
    safety,
  };
}

module.exports = {
  FALLBACK_REASON,
  isTimeoutError,
  normalizeRulesDays,
  buildRulesOnlyPlan,
  runDecisionWithFallback,
};
