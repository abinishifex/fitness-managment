const { z } = require('zod');
const { Invoice, Membership } = require('../database/models');
const {
  recordCash,
  listPendingPayments,
  listInvoicesDueWithin,
  generateInvoiceForMembership,
} = require('../services/billing');
const { createError } = require('../middleware/errorHandler');
const { serializeInvoice } = require('./membershipController');

function serializePayment(doc) {
  return {
    id: doc._id.toString(),
    invoiceId: doc.invoiceId?.toString?.() || String(doc.invoiceId),
    userId: doc.userId?.toString?.() || String(doc.userId),
    amount: doc.amount,
    currency: doc.currency,
    method: doc.method,
    status: doc.status,
    screenshotUrl: doc.screenshotUrl,
    recordedBy: doc.recordedBy ? String(doc.recordedBy) : null,
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    reviewedAt: doc.reviewedAt,
    rejectReason: doc.rejectReason,
    appliedAt: doc.appliedAt,
    idempotencyKey: doc.idempotencyKey,
    createdAt: doc.createdAt,
  };
}

function serializeMembershipLite(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    planId: doc.planId.toString(),
    status: doc.status,
    startDate: doc.startDate,
    endDate: doc.endDate,
    currentPeriodStart: doc.currentPeriodStart,
    currentPeriodEnd: doc.currentPeriodEnd,
  };
}

const cashSchema = z.object({
  membershipId: z.string().min(1),
  amount: z.number().min(0).optional(),
  idempotencyKey: z.string().min(1).max(120).optional(),
});

/**
 * POST /api/payments/cash — admin records cash; membership extends via applyPayment.
 */
async function postCash(req, res, next) {
  try {
    const parsed = cashSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const membership = await Membership.findById(parsed.data.membershipId);
    if (!membership) throw createError(404, 'Membership not found');

    const result = await recordCash({
      membershipId: parsed.data.membershipId,
      actorId: req.userId,
      amount: parsed.data.amount,
      idempotencyKey: parsed.data.idempotencyKey || null,
    });

    // If idempotent replay returned without membership, reload it.
    let membershipOut = result.membership;
    if (!membershipOut) {
      membershipOut = await Membership.findById(parsed.data.membershipId);
    }

    res.status(result.alreadyRecorded ? 200 : 201).json({
      success: true,
      data: {
        payment: serializePayment(result.payment),
        invoice: result.invoice ? serializeInvoice(result.invoice) : null,
        membership: serializeMembershipLite(membershipOut),
        alreadyRecorded: Boolean(result.alreadyRecorded),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/pending — admin review queue (Day 2; stub-ready Day 1).
 */
async function getPendingPayments(req, res, next) {
  try {
    const result = await listPendingPayments({
      limit: req.query.limit,
      skip: req.query.skip,
    });

    res.json({
      success: true,
      data: {
        payments: result.items.map((p) => serializePayment(p)),
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/invoices/due-within?days=3 — for Dev 2 reminder job.
 */
async function getInvoicesDueWithin(req, res, next) {
  try {
    const days = Number(req.query.days);
    if (!Number.isFinite(days) || days < 0) {
      throw createError(400, 'Query param days must be a non-negative number');
    }

    const result = await listInvoicesDueWithin(days, {
      includeOverdue: req.query.includeOverdue !== 'false',
      limit: req.query.limit,
    });

    res.json({
      success: true,
      data: {
        invoices: result.items.map((inv) => serializeInvoice(inv)),
        asOf: result.asOf,
        windowEnd: result.windowEnd,
        days: result.days,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/invoices — admin list; optional filters.
 */
async function listInvoices(req, res, next) {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.membershipId) filter.membershipId = req.query.membershipId;
    if (req.query.status) filter.status = req.query.status;

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ dueDate: 1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        invoices: items.map(serializeInvoice),
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
 * POST /api/memberships/:id/invoices — force generate next invoice (idempotent).
 */
async function postGenerateInvoice(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) throw createError(404, 'Membership not found');

    if (req.role !== 'admin' && String(membership.userId) !== req.userId) {
      throw createError(403, 'Access denied');
    }

    const invoice = await generateInvoiceForMembership(membership._id, {
      actorId: req.userId,
    });

    res.status(201).json({
      success: true,
      data: { invoice: serializeInvoice(invoice) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postCash,
  getPendingPayments,
  getInvoicesDueWithin,
  listInvoices,
  postGenerateInvoice,
  serializePayment,
};
