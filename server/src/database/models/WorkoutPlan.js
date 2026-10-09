const mongoose = require('mongoose');

const planExerciseSchema = new mongoose.Schema({
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true

  },
  action: {
    type: String,
    enum: ['KEEP', 'SWAP', 'ADD', 'REMOVE'],
    required: true
  },
  sets: { type: Number, required: true },
  reps: { type: String, required: true }, // e.g. "8-12"
  rpe: { type: Number },
  restSeconds: { type: Number }
}, { _id: false });

// 3a. Nested: days[]
const planDaySchema = new mongoose.Schema({
  dayOfWeek: { type: mongoose.Schema.Types.Mixed, required: true }, // "Monday" or 1-7
  exercises: [planExerciseSchema]
}, { _id: false });

const workoutPlanSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberProfile',
    required: true,
    index: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutTemplate',
    required: true
  },
  splitType: {
    type: String,
    enum: ['full_body', 'upper_lower', 'push_pull_legs', 'bro_split'],
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 80,
    default: '',
  },
  note: {
    type: String,
    trim: true,
    maxlength: 280,
    default: '',
  },
  // Training intent for THIS plan (not member profile). Snapshots at generation
  // so each library plan can have its own goal / experience / days / priorities.
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
  priorityMuscleGroup: { type: String, default: '' },
  trainingDaysPerWeek: { type: Number, required: true },
  sessionDurationMinutes: { type: Number, required: true },
  weeklyVolumeTarget: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g. { chest: 12, back: 14 }
  days: { type: [planDaySchema], required: true },
  aiReason: { type: String }, // maps to "reason" in the AI Output Contract
  aiDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiDecision' },
  status: {
    type: String,
    enum: ['draft', 'validated', 'active', 'archived'],
    required: true,
    default: 'draft'
  },
  // Show in Train grid / Workout dropdown when true; Settings can deactivate.
  enabled: { type: Boolean, required: true, default: true },
  validatedBy: {
    type: String,
    enum: ['system', 'manual'],
    required: true
  },
  // Selected plan for training (exactly one should be true per member when any exist).
  isActive: { type: Boolean, required: true, default: false }
}, { timestamps: true });

// Speeds up the common "give me this member's current active plan" query.
workoutPlanSchema.index({ memberId: 1, isActive: 1 });
workoutPlanSchema.index({ memberId: 1, enabled: 1 });


module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
