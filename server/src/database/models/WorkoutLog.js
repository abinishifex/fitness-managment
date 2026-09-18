const mongoose = require('mongoose');

const completedSetSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  weightKg: { type: Number, required: true },
  reps: { type: Number, required: true },
  completedAt: { type: Date, required: true }
}, { _id: false });

const workoutLogSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberProfile',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutPlan',
    required: true
  },
  dayOfWeek: { type: mongoose.Schema.Types.Mixed, required: true },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  setsCompleted: { type: [completedSetSchema], required: true },

 
  mutationId: { type: String, required: true, unique: true },
  syncState: {
    type: String,
    enum: ['PENDING', 'SYNCED', 'FAILED'],
    required: true,
    default: 'PENDING'
  },
  // Set on-device; used for Last-Write-Wins conflict resolution.
  clientTimestamp: { type: Date, required: true },
  // Set by the server on receipt — kept separate from clientTimestamp for sync debugging.
  serverReceivedAt: { type: Date, default: Date.now },

  sessionCompleted: { type: Boolean, default: false }
}, { timestamps: true });

// Supports fast "history for this member, most recent first" queries used by progress tracking.
workoutLogSchema.index({ memberId: 1, clientTimestamp: -1 });



module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
