const mongoose = require('mongoose');

const validationResultSchema = new mongoose.Schema({
  passed: { type: Boolean, required: true },
  reason: { type: String }
}, { _id: false });

const aiDecisionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberProfile',
    required: true,
    index: true
  },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan' }, // set once linked to a stored plan
  modelVersion: { type: String, required: true }, // e.g. "qwen2.5-7b-instruct" — keeps the model swappable
  promptSent: { type: String, required: true },
  rawOutput: { type: mongoose.Schema.Types.Mixed, required: true }, // unmodified AI response, matches Section 8 schema
  validationResult: { type: validationResultSchema, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AiDecision', aiDecisionSchema);
