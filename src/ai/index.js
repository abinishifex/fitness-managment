/**
 * Public AI module surface.
 * Day 3 Decision Engine should import `generateCompletion` from here,
 * then validate with `parseAiOutput` from contracts/aiOutputContract.
 */
const {
  generateCompletion,
  createProvider,
  DEFAULT_SYSTEM_PROMPT,
} = require('./gateway');
const { createMockProvider } = require('./providers/mock');
const { createOpenAiCompatibleProvider } = require('./providers/openaiCompatible');

module.exports = {
  generateCompletion,
  createProvider,
  createMockProvider,
  createOpenAiCompatibleProvider,
  DEFAULT_SYSTEM_PROMPT,
};
