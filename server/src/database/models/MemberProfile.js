const mongoose = require('mongoose');

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
  name: { type: String, trim: true, maxlength: 80, default: '' },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['male', 'female'], required: true },
  weightKg: { type: Number, required: true },
  heightCm: { type: Number, required: true },
  // Legacy defaults only — training intent lives on WorkoutPlan per protocol.
  fitnessGoal: {
    type: String,
    enum: ['muscle_gain', 'fat_loss', 'general_fitness', 'strength'],
    default: 'general_fitness',
  },
  trainingExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  trainingDaysPerWeek: { type: Number, default: 3 },
  sessionDurationMinutes: { type: Number, default: 45 },
  equipmentAvailable: [{ type: String, enum: EQUIPMENT_VALUES }],
  priorityMuscleGroup: { type: String, default: '' },
  limitations: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('MemberProfile', memberProfileSchema);
module.exports.EQUIPMENT_VALUES = EQUIPMENT_VALUES;
