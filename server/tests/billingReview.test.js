/**
 * Day 2 money path: transfer submit → approve/reject → membership extends.
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
const { PAYMENT_STATUS, INVOICE_STATUS } = require('../src/billing/enums');

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(baseUrl, method, path, { token, body, form } = {}) {
  const headers = form
    ? token
      ? { Authorization: `Bearer ${token}` }
      : {}
    : jsonHeaders(token);
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: form || (body === undefined ? undefined : JSON.stringify(body)),
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

describe('Day 2 billing: transfer approve/reject', () => {
  let server;
  let baseUrl;
  let planId;
  let membershipId;
  let invoiceId;
  let memberToken;
  let adminToken;
  let memberId;
  let adminUserId;
  let endDateBefore;
  const stamp = Date.now();

  before(async () => {
    const uri =
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gym-trainer-test';

    if (mongoose.connection.readyState === 0) {
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 20000,
            family: 4,
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      if (lastErr) throw lastErr;
    }

    await seedPlans();
    const monthly = await Plan.findOne({ slug: 'monthly', isActive: true });
    assert.ok(monthly);
    planId = monthly._id.toString();

    const adminHash = await bcrypt.hash('AdminPass123!', 12);
    const admin = await User.create({
      email: `review.admin.${stamp}@example.com`,
      passwordHash: adminHash,
      phone: `+2518${String(stamp).slice(-8)}`,
      role: 'admin',
    });
    adminUserId = admin._id.toString();

    const app = createApp();
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api`;

    const adminLogin = await request(baseUrl, 'POST', '/auth/login', {
      body: {
        email: `review.admin.${stamp}@example.com`,
        password: 'AdminPass123!',
      },
    });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;

    const reg = await request(baseUrl, 'POST', '/auth/register', {
      body: {
        email: `review.member.${stamp}@example.com`,
        password: 'MemberPass123!',
        phone: `+2519${String(stamp).slice(-8)}`,
        planId,
      },
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    memberToken = reg.body.data.token;
    memberId = reg.body.data.user.id;
    membershipId = reg.body.data.membership.id;
    invoiceId = reg.body.data.invoice.id;

    const membership = await Membership.findById(membershipId);
    endDateBefore = membership.endDate;
  });

  after(async () => {
    try {
      if (memberId) {
        await Payment.deleteMany({ userId: memberId });
        await Invoice.deleteMany({ userId: memberId });
        await Membership.deleteMany({ userId: memberId });
        await AuditLog.deleteMany({
          $or: [{ actorId: memberId }, { entityId: memberId }],
        });
        await User.deleteOne({ _id: memberId });
      }
      if (adminUserId) {
        await AuditLog.deleteMany({ actorId: adminUserId });
        await User.deleteOne({ _id: adminUserId });
      }
    } finally {
      if (server) await new Promise((r) => server.close(r));
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  });

  it('member submits transfer screenshot (stub upload in non-prod)', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('invoiceId', invoiceId);
    form.append('idempotencyKey', `xfer-test-${stamp}`);
    form.append('screenshot', new Blob([png], { type: 'image/png' }), 'shot.png');

    const res = await request(baseUrl, 'POST', '/payments/transfer', {
      token: memberToken,
      form,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.payment.status, PAYMENT_STATUS.PENDING);
    assert.equal(res.body.data.payment.method, 'transfer');
    assert.ok(res.body.data.payment.screenshotUrl);
  });

  it('idempotent transfer replay returns same payment', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('invoiceId', invoiceId);
    form.append('idempotencyKey', `xfer-test-${stamp}`);
    form.append('screenshot', new Blob([png], { type: 'image/png' }), 'shot.png');

    const res = await request(baseUrl, 'POST', '/payments/transfer', {
      token: memberToken,
      form,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.alreadyRecorded, true);
  });

  it('admin lists pending and rejects then member can resubmit path via new invoice state', async () => {
    // Reject this suite's pending transfer only (shared DB may have other pendings)
    const pending = await request(baseUrl, 'GET', '/payments/pending', { token: adminToken });
    assert.equal(pending.status, 200);
    assert.ok(pending.body.data.total >= 1);
    const ours = pending.body.data.payments.find((p) => p.invoiceId === invoiceId);
    assert.ok(ours, 'expected pending payment for this invoice');
    const paymentId = ours.id;

    const reject = await request(baseUrl, 'POST', `/payments/${paymentId}/reject`, {
      token: adminToken,
      body: { reason: 'Blurry' },
    });
    assert.equal(reject.status, 200, JSON.stringify(reject.body));
    assert.equal(reject.body.data.payment.status, PAYMENT_STATUS.REJECTED);

    // Reject again is idempotent
    const reject2 = await request(baseUrl, 'POST', `/payments/${paymentId}/reject`, {
      token: adminToken,
      body: { reason: 'Blurry' },
    });
    assert.equal(reject2.status, 200);
    assert.equal(reject2.body.data.alreadyRejected, true);
  });

  it('approve extends membership', async () => {
    // New transfer after reject
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('invoiceId', invoiceId);
    form.append('idempotencyKey', `xfer-approve-${stamp}`);
    form.append('screenshot', new Blob([png], { type: 'image/png' }), 'shot2.png');

    const submit = await request(baseUrl, 'POST', '/payments/transfer', {
      token: memberToken,
      form,
    });
    assert.equal(submit.status, 201, JSON.stringify(submit.body));
    const paymentId = submit.body.data.payment.id;

    const approve = await request(baseUrl, 'POST', `/payments/${paymentId}/approve`, {
      token: adminToken,
      body: {},
    });
    assert.equal(approve.status, 200, JSON.stringify(approve.body));
    assert.equal(approve.body.data.payment.status, PAYMENT_STATUS.APPROVED);

    const invoice = await Invoice.findById(invoiceId);
    assert.equal(invoice.status, INVOICE_STATUS.PAID);

    const membership = await Membership.findById(membershipId);
    assert.ok(membership.endDate > endDateBefore);

    // Idempotent approve
    const approve2 = await request(baseUrl, 'POST', `/payments/${paymentId}/approve`, {
      token: adminToken,
      body: {},
    });
    assert.equal(approve2.status, 200);
    assert.equal(approve2.body.data.alreadyApproved, true);
  });
});
