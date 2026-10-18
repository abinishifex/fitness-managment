const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User } = require('../database/models');
const { enrollMembership } = require('../services/billing/enrollMembership');
const { AUDIT_ACTION } = require('../billing/enums');
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

module.exports = {
  createCustomer,
  listMembers,
};
