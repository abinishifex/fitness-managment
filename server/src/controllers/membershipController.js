const { Membership, Invoice, Plan } = require('../database/models');
const { createError } = require('../middleware/errorHandler');
const { serializePlan } = require('./planController');

function serializeMembership(doc, { plan = null } = {}) {
  return {
    id: doc._id.toString(),
    userId: doc.userId?.toString?.() || String(doc.userId),
    planId: doc.planId?.toString?.() || String(doc.planId),
    status: doc.status,
    startDate: doc.startDate,
    endDate: doc.endDate,
    currentPeriodStart: doc.currentPeriodStart,
    currentPeriodEnd: doc.currentPeriodEnd,
    plan: plan ? serializePlan(plan) : undefined,
  };
}

function serializeInvoice(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    membershipId: doc.membershipId.toString(),
    planId: doc.planId.toString(),
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    dueDate: doc.dueDate,
    paidAt: doc.paidAt,
  };
}

/**
 * GET /api/memberships/me/status — lightweight soft-gate check.
 * Returns the current user's active membership status + any open invoice.
 */
async function getMyMembershipStatus(req, res, next) {
  try {
    // Find the most recently created active membership; fall back to any membership
    const activeMembership = await Membership.findOne({
      userId: req.userId,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .lean();

    const membership = activeMembership || (await Membership.findOne({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean());

    if (!membership) {
      return res.json({
        success: true,
        data: { status: 'none', membership: null, openInvoice: null },
      });
    }

    const plan = await Plan.findById(membership.planId).lean();

    // Find the oldest open/overdue invoice for this membership
    const openInvoice = await Invoice.findOne({
      membershipId: membership._id,
      status: { $in: ['open', 'overdue'] },
    })
      .sort({ dueDate: 1 })
      .lean();

    const now = new Date();
    let gate = membership.status;
    if (membership.status === 'active' && membership.endDate <= now) {
      gate = 'expired';
    }

    res.json({
      success: true,
      data: {
        status: gate,
        membership: serializeMembership(membership, { plan }),
        openInvoice: openInvoice ? serializeInvoice(openInvoice) : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/memberships/me — current user's memberships (newest first)
 */
async function getMyMemberships(req, res, next) {
  try {
    const memberships = await Membership.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const planIds = [...new Set(memberships.map((m) => String(m.planId)))];
    const plans = await Plan.find({ _id: { $in: planIds } }).lean();
    const planById = new Map(plans.map((p) => [p._id.toString(), p]));

    res.json({
      success: true,
      data: {
        memberships: memberships.map((m) =>
          serializeMembership(m, { plan: planById.get(String(m.planId)) })
        ),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/memberships/:id — owner or admin
 */
async function getMembership(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id).lean();
    if (!membership) throw createError(404, 'Membership not found');

    if (req.role !== 'admin' && String(membership.userId) !== req.userId) {
      throw createError(403, 'Access denied');
    }

    const plan = await Plan.findById(membership.planId).lean();
    res.json({
      success: true,
      data: { membership: serializeMembership(membership, { plan }) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/memberships — admin list (optional ?userId=)
 */
async function listMemberships(req, res, next) {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.status) filter.status = req.query.status;

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const [items, total] = await Promise.all([
      Membership.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email phone role isActive')
        .populate('planId')
        .lean(),
      Membership.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        memberships: items.map((m) => ({
          ...serializeMembership(m, {
            plan: m.planId && m.planId._id ? m.planId : null,
          }),
          user: m.userId && m.userId._id
            ? {
                id: m.userId._id.toString(),
                email: m.userId.email,
                phone: m.userId.phone,
                role: m.userId.role,
                isActive: m.userId.isActive,
              }
            : undefined,
        })),
        total,
        limit,
        skip,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/memberships/:id/invoices — owner or admin
 */
async function listMembershipInvoices(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id).lean();
    if (!membership) throw createError(404, 'Membership not found');

    if (req.role !== 'admin' && String(membership.userId) !== req.userId) {
      throw createError(403, 'Access denied');
    }

    const invoices = await Invoice.find({ membershipId: membership._id })
      .sort({ periodStart: -1 })
      .lean();

    res.json({
      success: true,
      data: { invoices: invoices.map(serializeInvoice) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyMemberships,
  getMyMembershipStatus,
  getMembership,
  listMemberships,
  listMembershipInvoices,
  serializeMembership,
  serializeInvoice,
};
