const { z } = require('zod');
const { Plan } = require('../database/models');
const { PLAN_INTERVAL_VALUES } = require('../billing/enums');
const { createError } = require('../middleware/errorHandler');

function serializePlan(plan) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

/**
 * GET /api/plans — public list of active plans (self-serve registration).
 * GET /api/plans?all=1 — admin: include inactive.
 */
async function listPlans(req, res, next) {
  try {
    const includeAll = req.query.all === '1' || req.query.all === 'true';
    if (includeAll && req.role !== 'admin') {
      throw createError(403, 'Admin role required to list inactive plans');
    }

    const filter = includeAll ? {} : { isActive: true };
    const plans = await Plan.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

    res.json({
      success: true,
      data: { plans: plans.map(serializePlan) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:idOrSlug
 */
async function getPlan(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const filter = /^[a-f\d]{24}$/i.test(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug.toLowerCase() };

    const plan = await Plan.findOne(filter).lean();
    if (!plan) throw createError(404, 'Plan not found');
    if (!plan.isActive && req.role !== 'admin') {
      throw createError(404, 'Plan not found');
    }

    res.json({ success: true, data: { plan: serializePlan(plan) } });
  } catch (err) {
    next(err);
  }
}

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  description: z.string().max(500).optional().default(''),
  price: z.number().min(0),
  currency: z.string().length(3).optional().default('ETB'),
  interval: z.enum(PLAN_INTERVAL_VALUES),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

/**
 * POST /api/plans — admin create
 */
async function createPlan(req, res, next) {
  try {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    let plan;
    try {
      plan = await Plan.create(parsed.data);
    } catch (err) {
      if (err && (err.code === 11000 || err.code === '11000')) {
        throw createError(409, 'Plan slug already exists');
      }
      throw err;
    }

    res.status(201).json({ success: true, data: { plan: serializePlan(plan) } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPlans,
  getPlan,
  createPlan,
  serializePlan,
};
