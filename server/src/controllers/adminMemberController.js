const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User, Membership, Invoice, Plan } = require('../database/models');
const { enrollMembership } = require('../services/billing/enrollMembership');
const { AUDIT_ACTION, MEMBERSHIP_STATUS, INVOICE_STATUS } = require('../billing/enums');
const { writeAudit } = require('../services/billing/audit');
const { createError } = require('../middleware/errorHandler');
const { serializeMembership, serializeInvoice } = require('./membershipController');
const { serializePlan } = require('./planController');

const phoneSchema = z
  .string()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone format');

const createCustomerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: phoneSchema,
  planId: z.string().min(1, 'planId is required'),
  name: z.string().max(80).optional(),
});

/**
 * POST /api/admin/members — admin creates a customer + enrolls on a plan.
 */
async function createCustomer(req, res, next) {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const { email, password, phone, planId } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/\s+/g, '');

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) throw createError(409, 'Email already registered');

    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) throw createError(409, 'Phone already registered');

    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    try {
      user = await User.create({
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        role: 'member',
      });
    } catch (err) {
      if (err && (err.code === 11000 || err.code === '11000')) {
        throw createError(409, 'Email or phone already registered');
      }
      throw err;
    }

    const { membership, invoice, plan } = await enrollMembership({
      userId: user._id,
      planId,
      actorId: req.userId,
    });

    await writeAudit({
      actorId: req.userId,
      action: AUDIT_ACTION.CUSTOMER_CREATED,
      entityType: 'User',
      entityId: user._id,
      meta: {
        email: user.email,
        phone: user.phone,
        membershipId: membership._id.toString(),
        planId: plan._id.toString(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        membership: serializeMembership(membership, { plan }),
        invoice: serializeInvoice(invoice),
        plan: serializePlan(plan),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/members — list member users (basic; Dev 2 UI consumes this).
 */
async function listMembers(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const q = (req.query.q || '').trim();

    const filter = { role: 'member' };
    if (q) {
      filter.$or = [
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { phone: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('email phone role isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        members: items.map((u) => ({
          id: u._id.toString(),
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
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
 * GET /api/admin/members/:id — full detail: user + active membership + plan + recent invoices.
 */
async function getMemberDetail(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .select('email phone role isActive createdAt')
      .lean();
    if (!user) throw createError(404, 'Member not found');

    // Active membership (most recent if multiple)
    const membership = await Membership.findOne({ userId: user._id, status: MEMBERSHIP_STATUS.ACTIVE })
      .sort({ createdAt: -1 })
      .lean();

    let plan = null;
    let invoices = [];

    if (membership) {
      [plan, invoices] = await Promise.all([
        Plan.findById(membership.planId).lean(),
        Invoice.find({ membershipId: membership._id })
          .sort({ periodStart: -1 })
          .limit(12)
          .lean(),
      ]);
    } else {
      // Fallback: any non-cancelled membership (expired)
      const anyMembership = await Membership.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean();
      if (anyMembership) {
        [plan, invoices] = await Promise.all([
          Plan.findById(anyMembership.planId).lean(),
          Invoice.find({ membershipId: anyMembership._id })
            .sort({ periodStart: -1 })
            .limit(12)
            .lean(),
        ]);
      }
    }

    res.json({
      success: true,
      data: {
        member: {
          id: user._id.toString(),
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        membership: membership
          ? serializeMembership(membership, { plan })
          : null,
        plan: plan ? serializePlan(plan) : null,
        invoices: invoices.map(serializeInvoice),
      },
    });
  } catch (err) {
    next(err);
  }
}

const patchMemberSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH /api/admin/members/:id — toggle isActive (deactivate / reactivate).
 */
async function patchMember(req, res, next) {
  try {
    const parsed = patchMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw createError(404, 'Member not found');
    if (user.role === 'admin' && req.userId === user._id.toString()) {
      throw createError(400, 'Admin cannot deactivate themselves');
    }

    user.isActive = parsed.data.isActive;
    await user.save();

    await writeAudit({
      actorId: req.userId,
      action: parsed.data.isActive ? AUDIT_ACTION.CUSTOMER_CREATED : AUDIT_ACTION.PAYMENT_REJECTED,
      entityType: 'User',
      entityId: user._id,
      meta: { isActive: parsed.data.isActive, changedBy: req.userId },
    });

    res.json({
      success: true,
      data: {
        member: {
          id: user._id.toString(),
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCustomer,
  listMembers,
  getMemberDetail,
  patchMember,
};
