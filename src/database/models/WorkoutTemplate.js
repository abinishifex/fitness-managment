const mongoose = require('mongoose');

const dayStructureSchema = new mongoose.Schema({
  dayOfWeek: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g. "Monday" or 1-7
  muscleGroups: [{ type: String, required: true }]
}, { _id: false });

const workoutTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // e.g. "FULL_BODY_BEGINNER_3D"
  splitType: {
    type: String,
    enum: ['full_body', 'upper_lower', 'push_pull_legs', 'bro_split'],
    required: true
  },
  daysPerWeek: { type: Number, required: true },
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  defaultStructure: [dayStructureSchema],
  isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);
