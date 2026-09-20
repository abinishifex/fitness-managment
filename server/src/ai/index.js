/**
 * Public AI module surface.
 * Day 3 Decision Engine: `runAiDecision` builds a structured prompt, calls
 * `generateCompletion`, validates with `parseAiOutput`, and persists AiDecision.
 */
const {
  generateCompletion,
  createProvider,
  DEFAULT_SYSTEM_PROMPT,
  GYMAI_SYSTEM_PROMPT,
  buildAiRequestPrompt,
  buildStructuredPrompt,
} = require('./gateway');
const { createMockProvider } = require('./providers/mock');
const { createOpenAiCompatibleProvider } = require('./providers/openaiCompatible');
const {
  createGeminiProvider,
  clearModelCooldowns,
} = require('./providers/gemini');
const {
  normalizeIntake,
  recommendSplit,
  profileToIntake,
  normalizeCatalog,
  summarizeHistory,
  GOAL_PRESCRIPTION,
} = require('./prompts/gymAi');
const {
  runAiDecision,
  loadDecisionContext,
  parseGatewayJson,
  extractJsonText,
} = require('./decisionEngine');

module.exports = {
  generateCompletion,
  createProvider,
  createMockProvider,
  createOpenAiCompatibleProvider,
  createGeminiProvider,
  clearModelCooldowns,
  DEFAULT_SYSTEM_PROMPT,
  GYMAI_SYSTEM_PROMPT,
  buildAiRequestPrompt,
  buildStructuredPrompt,
  normalizeIntake,
  recommendSplit,
  profileToIntake,
  normalizeCatalog,
  summarizeHistory,
  GOAL_PRESCRIPTION,
  runAiDecision,
  loadDecisionContext,
  parseGatewayJson,
  extractJsonText,
};
