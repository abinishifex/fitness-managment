// Central import point for all Mongoose models.
// Load order matters for Mongoose ref resolution — base collections first,
// then collections that reference them.

const User = require('./User');
const MemberProfile = require('./MemberProfile');
const Exercise = require('./Exercise');
const WorkoutTemplate = require('./WorkoutTemplate');
const AiDecision = require('./AiDecision');
const WorkoutPlan = require('./WorkoutPlan');
const WorkoutLog = require('./WorkoutLog');
const Progress = require('./Progress');

module.exports = {
  User,
  MemberProfile,
  Exercise,
  WorkoutTemplate,
  AiDecision,
  WorkoutPlan,
  WorkoutLog,
  Progress
};
