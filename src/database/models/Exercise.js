const mongoose = require('mongoose');
const { EQUIPMENT_VALUES } = require('./MemberProfile');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  primaryMuscles: [{ type: String, required: true }],
  secondaryMuscles: [{ type: String }],
  movementPattern: { type: String },
  equipmentRequired: [{ type: String, enum: EQUIPMENT_VALUES, required: true }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  type: { type: String, enum: ['compound', 'isolation'], required: true },
  instructions: { type: String, required: true },
  formCues: [{ type: String }],
  contraindications: [{ type: String }],
  approvedSubstitutions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
  // Critical: the AI Decision Engine must only ever select exercises where isApproved === true.
  isApproved: { type: Boolean, required: true, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
