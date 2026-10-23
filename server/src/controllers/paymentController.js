const { z } = require('zod');
const { Invoice, Membership } = require('../database/models');
const {
  recordCash,
  listPendingPayments,
  listInvoicesDueWithin,
  generateInvoiceForMembership,
  approvePayment,
  rejectPayment,
  recordTransfer,
} = require('../services/billing');
const {
  uploadScreenshotOrStub,
  signedScreenshotUrl,
} = require('../services/upload/cloudinary');
const { createError } = require('../middleware/errorHandler');
const { serializeInvoice } = require('./membershipController');

function idOf(ref) {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return ref._id.toString();
  return ref.toString?.() || String(ref);
}

function serializeUserLite(ref) {
  if (!ref || typeof ref !== 'object' || !ref._id) return null;
  return {
    id: ref._id.toString(),
    email: ref.email || null,
    phone: ref.phone || null,
  };
}

function serializePayment(doc) {
  const publicId = doc.screenshotPublicId || null;
  const freshUrl = publicId ? signedScreenshotUrl(publicId) : null;
  const user = serializeUserLite(doc.userId);
  return {
    id: doc._id.toString(),
    invoiceId: idOf(doc.invoiceId),
    userId: user ? user.id : idOf(doc.userId),
    user,
    amount: doc.amount,
    currency: doc.currency,
    method: doc.method,
    status: doc.status,
    screenshotUrl: freshUrl || doc.screenshotUrl,
    screenshotPublicId: publicId,
    recordedBy: doc.recordedBy ? idOf(doc.recordedBy) : null,
    reviewedBy: doc.reviewedBy ? idOf(doc.reviewedBy) : null,
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
 * GET /api/payments/pending — admin review queue.
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

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/payments/:id/approve — admin approves pending transfer → applyPayment.
 */
async function postApprovePayment(req, res, next) {
  try {
    const result = await approvePayment(req.params.id, { actorId: req.userId });
    res.json({
      success: true,
      data: {
        payment: serializePayment(result.payment),
        invoice: result.invoice ? serializeInvoice(result.invoice) : null,
        membership: serializeMembershipLite(result.membership),
        alreadyApproved: Boolean(result.alreadyApproved || result.alreadyApplied),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/:id/reject — admin rejects pending transfer.
 */
async function postRejectPayment(req, res, next) {
  try {
    const parsed = rejectSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const result = await rejectPayment(req.params.id, {
      actorId: req.userId,
      reason: parsed.data.reason || null,
    });

    res.json({
      success: true,
      data: {
        payment: serializePayment(result.payment),
        alreadyRejected: Boolean(result.alreadyRejected),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/transfer — member uploads screenshot for an open invoice.
 * Expects multipart field "screenshot" and body field invoiceId.
 */
async function postTransfer(req, res, next) {
  try {
    const invoiceId = req.body?.invoiceId;
    if (!invoiceId) throw createError(400, 'invoiceId is required');

    const idempotencyKey = req.body?.idempotencyKey || null;
    const upload = await uploadScreenshotOrStub(req.file);
    const result = await recordTransfer({
      invoiceId,
      userId: req.userId,
      screenshotUrl: upload.url,
      screenshotPublicId: upload.publicId || null,
      idempotencyKey,
    });

    res.status(result.alreadyRecorded ? 200 : 201).json({
      success: true,
      data: {
        payment: serializePayment(result.payment),
        alreadyRecorded: Boolean(result.alreadyRecorded),
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
 * GET /api/invoices/:id — fetch a single invoice (owner or admin).
 */
async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) throw createError(404, 'Invoice not found');

    if (req.role !== 'admin' && String(invoice.userId) !== req.userId) {
      throw createError(403, 'Access denied');
    }

    res.json({ success: true, data: { invoice: serializeInvoice(invoice) } });
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
      Invoice.find(filter)
        .populate('userId', 'email phone')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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
  postApprovePayment,
  postRejectPayment,
  postTransfer,
  getInvoicesDueWithin,
  getInvoice,
  listInvoices,
  postGenerateInvoice,
  serializePayment,
};
