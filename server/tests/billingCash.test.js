/**
 * Day 1 money path: register → admin cash → membership extends.
 * Requires MongoDB (MONGODB_URI / MONGODB_URI_TEST).
 */
require('../src/config/loadDotenv');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const {
  User,
  Plan,
  Membership,
  Invoice,
  Payment,
  AuditLog,
} = require('../src/database/models');
const { seedPlans } = require('../scripts/seedPlans');
const { INVOICE_STATUS, PAYMENT_STATUS } = require('../src/billing/enums');

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(baseUrl, method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: jsonHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

describe('Day 1 billing: register + cash extends membership', () => {
  let server;
  let baseUrl;
  let planId;
  let memberUserId;
  let membershipId;
  let adminToken;
  const stamp = Date.now();
  const memberEmail = `billing.member.${stamp}@example.com`;
  const adminEmail = `billing.admin.${stamp}@example.com`;

  before(async () => {
    const uri =
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gym-trainer-test';

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        family: 4,
      });
    }

    await seedPlans();
    const monthly = await Plan.findOne({ slug: 'monthly', isActive: true });
    assert.ok(monthly);
    planId = monthly._id.toString();

    const passwordHash = await bcrypt.hash('AdminPass123!', 12);
    const admin = await User.create({
      email: adminEmail,
      passwordHash,
      phone: `+2517${String(stamp).slice(-8)}`,
      role: 'admin',
    });

    const app = createApp();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = await request(baseUrl, 'POST', '/api/auth/login', {
      body: { email: adminEmail, password: 'AdminPass123!' },
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    adminToken = login.body.data.token;
    assert.ok(adminToken);

    // keep admin id for cleanup reference
    void admin;
  });

  after(async () => {
    try {
      if (memberUserId) {
        await Payment.deleteMany({ userId: memberUserId });
        await Invoice.deleteMany({ userId: memberUserId });
        await Membership.deleteMany({ userId: memberUserId });
        await AuditLog.deleteMany({
          $or: [{ actorId: memberUserId }, { entityId: memberUserId }],
        });
        await User.deleteOne({ _id: memberUserId });
      }
      await User.deleteOne({ email: adminEmail });
      await AuditLog.deleteMany({ actorId: { $exists: true } }).catch(() => {});
    } finally {
      if (server) await new Promise((r) => server.close(r));
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  });

  it('lists active plans publicly', async () => {
    const res = await request(baseUrl, 'GET', '/api/plans');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data.plans.length >= 1);
    assert.ok(res.body.data.plans.every((p) => p.isActive));
  });

  it('registers with plan + phone and opens an invoice', async () => {
    const res = await request(baseUrl, 'POST', '/api/auth/register', {
      body: {
        email: memberEmail,
        password: 'MemberPass123!',
        phone: `+2519${String(stamp).slice(-8)}`,
        planId,
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    memberUserId = res.body.data.user.id;
    membershipId = res.body.data.membership.id;
    assert.equal(res.body.data.invoice.status, INVOICE_STATUS.OPEN);
    assert.equal(
      new Date(res.body.data.membership.endDate).getTime(),
      new Date(res.body.data.membership.startDate).getTime(),
      'endDate starts equal to startDate until cash is applied'
    );
  });

  it('admin records cash and membership endDate extends', async () => {
    const before = await Membership.findById(membershipId);
    assert.ok(before);

    const cash = await request(baseUrl, 'POST', '/api/payments/cash', {
      token: adminToken,
      body: {
        membershipId,
        idempotencyKey: `cash-${stamp}`,
      },
    });
    assert.equal(cash.status, 201, JSON.stringify(cash.body));
    assert.equal(cash.body.data.payment.status, PAYMENT_STATUS.APPROVED);
    assert.equal(cash.body.data.invoice.status, INVOICE_STATUS.PAID);

    const after = await Membership.findById(membershipId);
    assert.ok(after.endDate > before.endDate);

    // Idempotent replay
    const replay = await request(baseUrl, 'POST', '/api/payments/cash', {
      token: adminToken,
      body: {
        membershipId,
        idempotencyKey: `cash-${stamp}`,
      },
    });
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.data.alreadyRecorded, true);
  });

  it('exposes listInvoicesDueWithin for Dev 2', async () => {
    const res = await request(baseUrl, 'GET', '/api/invoices/due-within?days=3', {
      token: adminToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data.invoices));
  });
});
