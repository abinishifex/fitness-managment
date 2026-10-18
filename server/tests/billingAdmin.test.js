/**
 * Day 1 billing gap tests:
 *   - GET /api/admin/members/:id   — member detail with membership + invoices
 *   - GET /api/invoices/:id        — single invoice (owner + admin)
 *   - GET /api/memberships/me/status — soft-gate status
 *   - PATCH /api/admin/members/:id — deactivate / reactivate member
 *
 * Requires a live MongoDB (MONGODB_URI / MONGODB_URI_TEST).
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
const { INVOICE_STATUS } = require('../src/billing/enums');

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

describe('Day 1 billing gaps: member detail, invoice, status, deactivate', () => {
  let server;
  let baseUrl;
  let adminToken;
  let memberToken;
  let memberId;
  let membershipId;
  let invoiceId;
  let adminUserId;

  const stamp = Date.now();
  const memberEmail = `gap.member.${stamp}@example.com`;
  const adminEmail = `gap.admin.${stamp}@example.com`;
  const memberPhone = `+2517${String(stamp).slice(-8)}`;
  const adminPhone = `+2518${String(stamp).slice(-8)}`;

  before(async () => {
    const uri =
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gym-trainer-test';

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, family: 4 });
    }

    await seedPlans();
    const monthly = await Plan.findOne({ slug: 'monthly', isActive: true });
    assert.ok(monthly, 'monthly plan must exist');
    const planId = monthly._id.toString();

    // Create admin directly in DB
    const adminHash = await bcrypt.hash('AdminPass123!', 12);
    const adminUser = await User.create({
      email: adminEmail,
      passwordHash: adminHash,
      phone: adminPhone,
      role: 'admin',
    });
    adminUserId = adminUser._id.toString();

    const app = createApp();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Login admin
    const adminLogin = await request(baseUrl, 'POST', '/api/auth/login', {
      body: { email: adminEmail, password: 'AdminPass123!' },
    });
    assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
    adminToken = adminLogin.body.data.token;

    // Register member via API (gets membership + invoice)
    const reg = await request(baseUrl, 'POST', '/api/auth/register', {
      body: {
        email: memberEmail,
        password: 'MemberPass123!',
        phone: memberPhone,
        planId,
      },
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    memberId = reg.body.data.user.id;
    membershipId = reg.body.data.membership.id;
    invoiceId = reg.body.data.invoice.id;
    memberToken = reg.body.data.token;
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
        await User.deleteOne({ _id: adminUserId });
        await AuditLog.deleteMany({ actorId: adminUserId });
      }
    } finally {
      if (server) await new Promise((r) => server.close(r));
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  });

  // ─── GET /api/admin/members/:id ────────────────────────────────────────────

  it('admin fetches member detail with membership and invoices', async () => {
    const res = await request(baseUrl, 'GET', `/api/admin/members/${memberId}`, {
      token: adminToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { member, membership, plan, invoices } = res.body.data;

    assert.equal(member.id, memberId);
    assert.equal(member.email, memberEmail);
    assert.ok(member.phone);
    assert.equal(member.role, 'member');
    assert.equal(member.isActive, true);

    assert.ok(membership, 'membership should be present');
    assert.equal(membership.id, membershipId);
    assert.equal(membership.status, 'active');

    assert.ok(plan, 'plan should be embedded');
    assert.equal(plan.slug, 'monthly');

    assert.ok(Array.isArray(invoices), 'invoices should be an array');
    assert.ok(invoices.length >= 1, 'should have at least 1 invoice');
    assert.equal(invoices[0].id, invoiceId);
  });

  it('returns 404 for unknown member id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(baseUrl, 'GET', `/api/admin/members/${fakeId}`, {
      token: adminToken,
    });
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  it('member cannot access admin member detail', async () => {
    const res = await request(baseUrl, 'GET', `/api/admin/members/${memberId}`, {
      token: memberToken,
    });
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  // ─── GET /api/invoices/:id ─────────────────────────────────────────────────

  it('admin fetches single invoice by id', async () => {
    const res = await request(baseUrl, 'GET', `/api/invoices/${invoiceId}`, {
      token: adminToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { invoice } = res.body.data;
    assert.equal(invoice.id, invoiceId);
    assert.equal(invoice.status, INVOICE_STATUS.OPEN);
    assert.ok(invoice.amount > 0);
  });

  it('owner member fetches their own invoice', async () => {
    const res = await request(baseUrl, 'GET', `/api/invoices/${invoiceId}`, {
      token: memberToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.invoice.id, invoiceId);
  });

  it("member cannot fetch another user's invoice", async () => {
    // Create a second member, get their invoice, then try to access with first member
    const stamp2 = Date.now();
    const monthly = await Plan.findOne({ slug: 'monthly', isActive: true });
    const reg2 = await request(baseUrl, 'POST', '/api/auth/register', {
      body: {
        email: `gap.other.${stamp2}@example.com`,
        password: 'OtherPass123!',
        phone: `+2511${String(stamp2).slice(-8)}`,
        planId: monthly._id.toString(),
      },
    });
    assert.equal(reg2.status, 201, JSON.stringify(reg2.body));
    const otherInvoiceId = reg2.body.data.invoice.id;
    const otherUserId = reg2.body.data.user.id;

    try {
      const res = await request(baseUrl, 'GET', `/api/invoices/${otherInvoiceId}`, {
        token: memberToken,
      });
      assert.equal(res.status, 403, JSON.stringify(res.body));
    } finally {
      // cleanup second member
      await Payment.deleteMany({ userId: otherUserId });
      await Invoice.deleteMany({ userId: otherUserId });
      await Membership.deleteMany({ userId: otherUserId });
      await User.deleteOne({ _id: otherUserId });
    }
  });

  it('returns 404 for unknown invoice id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(baseUrl, 'GET', `/api/invoices/${fakeId}`, {
      token: adminToken,
    });
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  // ─── GET /api/memberships/me/status ───────────────────────────────────────

  it('member gets their membership status', async () => {
    const res = await request(baseUrl, 'GET', '/api/memberships/me/status', {
      token: memberToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { status, membership, openInvoice } = res.body.data;

    // endDate === startDate at enrollment (not paid yet) → gateway should show "expired"
    // but the membership itself is status: active; our gate returns 'expired' when endDate <= now
    assert.ok(['active', 'expired', 'cancelled'].includes(status));
    assert.ok(membership, 'membership should be present');
    assert.ok(openInvoice, 'open invoice should be present (not yet paid)');
    assert.equal(openInvoice.status, INVOICE_STATUS.OPEN);
  });

  it('returns status=none when user has no membership', async () => {
    // Create a bare user with no membership
    const bareHash = await bcrypt.hash('BarePass123!', 12);
    const bareUser = await User.create({
      email: `gap.bare.${stamp}@example.com`,
      passwordHash: bareHash,
      phone: `+2516${String(stamp).slice(-8)}`,
      role: 'member',
    });
    try {
      const bareLogin = await request(baseUrl, 'POST', '/api/auth/login', {
        body: { email: `gap.bare.${stamp}@example.com`, password: 'BarePass123!' },
      });
      const bareToken = bareLogin.body.data.token;
      const res = await request(baseUrl, 'GET', '/api/memberships/me/status', {
        token: bareToken,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.status, 'none');
      assert.equal(res.body.data.membership, null);
      assert.equal(res.body.data.openInvoice, null);
    } finally {
      await User.deleteOne({ _id: bareUser._id });
    }
  });

  // ─── PATCH /api/admin/members/:id — deactivate / reactivate ───────────────

  it('admin deactivates a member', async () => {
    const res = await request(baseUrl, 'PATCH', `/api/admin/members/${memberId}`, {
      token: adminToken,
      body: { isActive: false },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.member.isActive, false);

    // Verify in DB
    const user = await User.findById(memberId);
    assert.equal(user.isActive, false);
  });

  it('deactivated member cannot log in', async () => {
    const res = await request(baseUrl, 'POST', '/api/auth/login', {
      body: { email: memberEmail, password: 'MemberPass123!' },
    });
    // login returns 401 (invalid or deactivated)
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  it('admin reactivates the member', async () => {
    const res = await request(baseUrl, 'PATCH', `/api/admin/members/${memberId}`, {
      token: adminToken,
      body: { isActive: true },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.member.isActive, true);
  });

  it('reactivated member can log in again', async () => {
    const res = await request(baseUrl, 'POST', '/api/auth/login', {
      body: { email: memberEmail, password: 'MemberPass123!' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data.token);
  });

  it('member cannot deactivate another member', async () => {
    const res = await request(baseUrl, 'PATCH', `/api/admin/members/${memberId}`, {
      token: memberToken,
      body: { isActive: false },
    });
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  it('returns 400 for missing isActive field', async () => {
    const res = await request(baseUrl, 'PATCH', `/api/admin/members/${memberId}`, {
      token: adminToken,
      body: { foo: 'bar' },
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it('returns 404 for unknown member id on patch', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(baseUrl, 'PATCH', `/api/admin/members/${fakeId}`, {
      token: adminToken,
      body: { isActive: false },
    });
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });
});
