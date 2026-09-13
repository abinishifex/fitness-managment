const mongoose = require('mongoose');

// Fixed vocab lists — must stay identical to what Developer 2's AI prompts use.
// See Schema Doc Section 9 ("Fixed Enum Value Lists").
const EQUIPMENT_VALUES = [
  'barbell', 'dumbbell', 'machine', 'cable_machine', 'bodyweight',
  'resistance_bands', 'kettlebell', 'bench', 'pull_up_bar', 'none'
];

const memberProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['male', 'female'], required: true },
  weightKg: { type: Number, required: true },
  heightCm: { type: Number, required: true },
  fitnessGoal: {
    type: String,
    enum: ['muscle_gain', 'fat_loss', 'general_fitness', 'strength'],
    required: true
  },
  trainingExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  trainingDaysPerWeek: { type: Number, required: true },
  sessionDurationMinutes: { type: Number, required: true },
  equipmentAvailable: [{ type: String, enum: EQUIPMENT_VALUES }],
  priorityMuscleGroup: { type: String },
  limitations: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('MemberProfile', memberProfileSchema);
module.exports.EQUIPMENT_VALUES = EQUIPMENT_VALUES;
