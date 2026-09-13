const mongoose = require('mongoose');

const exerciseProgressSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  bestWeightKg: { type: Number },
  bestReps: { type: Number },
  lastPerformed: { type: Date }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberProfile',
    required: true,
    unique: true // one progress doc per member
  },
  totalWorkoutsCompleted: { type: Number, required: true, default: 0 },
  totalSetsLogged: { type: Number, required: true, default: 0 },
  currentStreakDays: { type: Number, default: 0 },
  lastWorkoutDate: { type: Date },
  exerciseProgress: { type: [exerciseProgressSchema], default: [] },
  completionRate: { type: Number } // percentage
}, { timestamps: true });

// IMPORTANT: this collection is derived/aggregated only.
// It must be written exclusively by a backend function (e.g. updateProgressAfterLog())
// that runs after a WorkoutLog write succeeds. It should never be writable directly
// by the client or by the AI Gateway — enforce this at the route/controller layer,
// since Mongoose itself won't stop a direct write.
module.exports = mongoose.model('Progress', progressSchema);
