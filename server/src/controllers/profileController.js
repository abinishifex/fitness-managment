const { z } = require('zod');
const { MemberProfile } = require('../database/models');
const { createError } = require('../middleware/errorHandler');
const {
  EQUIPMENT_VALUES,
  FITNESS_GOAL_VALUES,
  TRAINING_EXPERIENCE_VALUES,
  SEX_VALUES,
} = require('../config/constants');

// Validation schema for profile upsert
const profileSchema = z.object({
  age: z.number().int().min(13, 'Age must be at least 13').max(120, 'Age must be 120 or less'),
  sex: z.enum(SEX_VALUES, {
    message: `sex must be one of: ${SEX_VALUES.join(', ')}`,
  }),
  weightKg: z.number().positive('weightKg must be positive'),
  heightCm: z.number().positive('heightCm must be positive'),
  fitnessGoal: z.enum(FITNESS_GOAL_VALUES, {
    message: `fitnessGoal must be one of: ${FITNESS_GOAL_VALUES.join(', ')}`,
  }),
  trainingExperience: z.enum(TRAINING_EXPERIENCE_VALUES, {
    message: `trainingExperience must be one of: ${TRAINING_EXPERIENCE_VALUES.join(', ')}`,
  }),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  sessionDurationMinutes: z.number().int().min(15).max(300),
  equipmentAvailable: z
    .array(
      z.enum(EQUIPMENT_VALUES, {
        message: `Each equipment item must be one of: ${EQUIPMENT_VALUES.join(', ')}`,
      })
    )
    .optional()
    .default([]),
  priorityMuscleGroup: z.string().optional(),
  limitations: z.array(z.string()).optional().default([]),
});

/**
 * GET /api/profile
 * Get the current user's profile
 */
async function getProfile(req, res, next) {
  try {
    const profile = await MemberProfile.findOne({ userId: req.userId });

    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    res.json({
      success: true,
      data: { profile },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile
 * Create or update the current user's profile (upsert)
 */
async function updateProfile(req, res, next) {
  try {
    // Validate input
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const profileData = parsed.data;

    // Upsert: create if doesn't exist, update if exists (scoped to req.userId only)
    const profile = await MemberProfile.findOneAndUpdate(
      { userId: req.userId },
      { ...profileData, userId: req.userId },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: { profile },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
