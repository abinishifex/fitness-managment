/**
 * AI Decision Engine (Day 3 / Dev2)
 *
 * Flow: structured prompt → AI Gateway → validate vs Day-1 Section 8 schema
 * → persist AiDecision (always, with validationResult.passed true|false).
 *
 * Does not write WorkoutPlan — that is Day 4 plan generation.
 */

const { AiDecision, Exercise, MemberProfile, WorkoutLog } = require('../database/models');
const { parseAiOutput } = require('../contracts/aiOutputContract');
const { generateCompletion } = require('./gateway');
const { buildStructuredPrompt } = require('./prompts/gymAi');

/**
 * Strip markdown fences some models wrap around JSON.
 * @param {string} text
 */
function extractJsonText(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parse gateway text into an object (or mark unparsed).
 * @param {string} text
 * @returns {{ raw: unknown, parseError?: string }}
 */
function parseGatewayJson(text) {
  try {
    return { raw: JSON.parse(extractJsonText(text)) };
  } catch (err) {
    return {
      raw: { _unparsed: text },
      parseError: err.message || 'Invalid JSON from AI gateway',
    };
  }
}

/**
 * Load prompt inputs for a member from Mongo when callers only pass memberId.
 *
 * @param {string|import('mongoose').Types.ObjectId} memberId
 * @param {{
 *   historyLimit?: number,
 *   catalogLimit?: number,
 *   MemberProfileModel?: typeof MemberProfile,
 *   WorkoutLogModel?: typeof WorkoutLog,
 *   ExerciseModel?: typeof Exercise,
 * }} [opts]
 */
async function loadDecisionContext(memberId, opts = {}) {
  const Profile = opts.MemberProfileModel || MemberProfile;
  const Log = opts.WorkoutLogModel || WorkoutLog;
  const Ex = opts.ExerciseModel || Exercise;
  const historyLimit = opts.historyLimit ?? 20;
  const catalogLimit = opts.catalogLimit ?? 200;

  const profile = await Profile.findById(memberId).lean();
  if (!profile) {
    const err = new Error(`MemberProfile not found: ${memberId}`);
    err.status = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  const [history, catalog] = await Promise.all([
    Log.find({ memberId })
      .sort({ clientTimestamp: -1 })
      .limit(historyLimit)
      .lean(),
    Ex.find({ isApproved: true }).sort({ name: 1 }).limit(catalogLimit).lean(),
  ]);

  return { profile, history, catalog };
}

/**
 * Run one AI decision for a member.
 *
 * Pass either:
 *   - `{ memberId, rules }` and let the engine load profile/history/catalog, or
 *   - `{ memberId, profile, history, catalog, rules }` to skip DB reads (tests / Dev1).
 *
 * @param {{
 *   memberId: string|import('mongoose').Types.ObjectId,
 *   rules?: unknown,
 *   profile?: Record<string, unknown>,
 *   history?: Array<Record<string, unknown>>,
 *   catalog?: Array<Record<string, unknown>>,
 *   weekNumber?: number,
 *   preferredSplit?: string,
 *   cardioInclusion?: boolean,
 *   extraInstructions?: string,
 *   planId?: string|import('mongoose').Types.ObjectId,
 *   persist?: boolean,
 *   provider?: object,
 *   AiDecisionModel?: typeof AiDecision,
 *   generate?: typeof generateCompletion,
 *   MemberProfileModel?: typeof MemberProfile,
 *   WorkoutLogModel?: typeof WorkoutLog,
 *   ExerciseModel?: typeof Exercise,
 * }} input
 * @returns {Promise<{
 *   decision: object|null,
 *   prompt: string,
 *   modelVersion: string,
 *   provider: string,
 *   latencyMs: number,
 *   rawOutput: unknown,
 *   parsed: object|null,
 *   validationResult: { passed: boolean, reason?: string },
 * }>}
 */
async function runAiDecision(input = {}) {
  const {
    memberId,
    rules = null,
    weekNumber,
    preferredSplit,
    cardioInclusion,
    extraInstructions = '',
    planId,
    persist = true,
    provider,
    AiDecisionModel = AiDecision,
    generate = generateCompletion,
  } = input;

  if (!memberId) {
    const err = new Error('runAiDecision requires memberId');
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }

  let { profile, history, catalog } = input;
  if (!profile || !catalog) {
    const loaded = await loadDecisionContext(memberId, {
      MemberProfileModel: input.MemberProfileModel,
      WorkoutLogModel: input.WorkoutLogModel,
      ExerciseModel: input.ExerciseModel,
    });
    profile = profile || loaded.profile;
    history = history || loaded.history;
    catalog = catalog || loaded.catalog;
  }
  history = history || [];

  const { prompt } = buildStructuredPrompt({
    profile,
    history,
    catalog,
    rules,
    weekNumber,
    preferredSplit,
    cardioInclusion,
    extraInstructions,
  });

  const completion = await generate({ prompt, provider, jsonMode: true });
  const { raw, parseError } = parseGatewayJson(completion.text);

  let validationResult;
  let parsed = null;

  if (parseError) {
    validationResult = { passed: false, reason: parseError };
  } else {
    const result = parseAiOutput(raw);
    if (result.success) {
      parsed = result.data;
      validationResult = { passed: true };
    } else {
      const issues = (result.error?.issues || [])
        .map((i) => `${i.path?.join('.') || '?'}: ${i.message}`)
        .join('; ');
      validationResult = {
        passed: false,
        reason: issues || 'AI output failed Day-1 schema validation',
      };
    }
  }

  let decision = null;
  if (persist) {
    decision = await AiDecisionModel.create({
      memberId,
      planId: planId || undefined,
      modelVersion: completion.modelVersion,
      promptSent: prompt,
      rawOutput: raw,
      validationResult,
    });
  }

  return {
    decision,
    prompt,
    modelVersion: completion.modelVersion,
    provider: completion.provider,
    latencyMs: completion.latencyMs,
    rawOutput: raw,
    parsed,
    validationResult,
  };
}

module.exports = {
  extractJsonText,
  parseGatewayJson,
  loadDecisionContext,
  runAiDecision,
};
