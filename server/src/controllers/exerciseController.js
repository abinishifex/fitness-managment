const { z } = require('zod');
const mongoose = require('mongoose');
const { Exercise } = require('../database/models');
const { createError } = require('../middleware/errorHandler');
const {
  EQUIPMENT_VALUES,
  TRAINING_EXPERIENCE_VALUES,
} = require('../config/constants');

const listQuerySchema = z.object({
  muscle: z.string().trim().min(1).optional(),
  equipment: z.enum(EQUIPMENT_VALUES).optional(),
  difficulty: z.enum(TRAINING_EXPERIENCE_VALUES).optional(),
  type: z.enum(['compound', 'isolation']).optional(),
  q: z.string().trim().min(1).optional(),
  /** Default: only approved exercises. Pass "true" to include unapproved. */
  includeUnapproved: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .default('false'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

/**
 * GET /api/exercises
 * List catalogue exercises with optional filters.
 */
async function listExercises(req, res, next) {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const { muscle, equipment, difficulty, type, q, includeUnapproved, limit } =
      parsed.data;

    const filter = {};
    if (includeUnapproved !== 'true') {
      filter.isApproved = true;
    }
    if (muscle) {
      filter.$or = [
        { primaryMuscles: muscle },
        { secondaryMuscles: muscle },
      ];
    }
    if (equipment) {
      filter.equipmentRequired = equipment;
    }
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    if (type) {
      filter.type = type;
    }
    if (q) {
      filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const exercises = await Exercise.find(filter)
      .sort({ name: 1 })
      .limit(limit)
      .populate('approvedSubstitutions', 'name slug primaryMuscles equipmentRequired difficulty')
      .lean();

    res.json({
      success: true,
      data: {
        count: exercises.length,
        exercises,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/exercises/:idOrSlug
 * Fetch one exercise by Mongo ObjectId or slug.
 */
async function getExercise(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    if (!idOrSlug) {
      throw createError(400, 'Exercise id or slug is required');
    }

    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { slug: idOrSlug };

    const exercise = await Exercise.findOne(query)
      .populate('approvedSubstitutions', 'name slug primaryMuscles equipmentRequired difficulty')
      .lean();

    if (!exercise) {
      throw createError(404, 'Exercise not found');
    }

    res.json({
      success: true,
      data: { exercise },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listExercises,
  getExercise,
};
