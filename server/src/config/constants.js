/**
 * Shared constants for validation
 * Extracted from model enums to use in Zod schemas
 */

// From MemberProfile model
const { EQUIPMENT_VALUES } = require('../database/models/MemberProfile');

const FITNESS_GOAL_VALUES = [
  'muscle_gain',
  'fat_loss',
  'general_fitness',
  'strength',
];

const TRAINING_EXPERIENCE_VALUES = ['beginner', 'intermediate', 'advanced'];

const SEX_VALUES = ['male', 'female'];

module.exports = {
  EQUIPMENT_VALUES,
  FITNESS_GOAL_VALUES,
  TRAINING_EXPERIENCE_VALUES,
  SEX_VALUES,
};
