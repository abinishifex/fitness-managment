const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  addDays,
  daysForInterval,
  nextPeriod,
} = require('../src/services/billing/period');
const {
  PLAN_INTERVAL,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
} = require('../src/billing/enums');

describe('billing period helpers', () => {
  it('maps intervals to day counts', () => {
    assert.equal(daysForInterval(PLAN_INTERVAL.MONTHLY), 30);
    assert.equal(daysForInterval(PLAN_INTERVAL.QUARTERLY), 90);
    assert.equal(daysForInterval(PLAN_INTERVAL.YEARLY), 365);
  });

  it('builds the first period from startDate', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const { periodStart, periodEnd, dueDate } = nextPeriod({
      startDate: start,
      interval: PLAN_INTERVAL.MONTHLY,
    });
    assert.equal(periodStart.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(periodEnd.toISOString(), '2026-01-31T00:00:00.000Z');
    assert.equal(dueDate.toISOString(), '2026-01-01T00:00:00.000Z');
  });

  it('chains the next period after a paid end', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const afterEnd = addDays(start, 30);
    const { periodStart, periodEnd } = nextPeriod({
      startDate: start,
      interval: PLAN_INTERVAL.MONTHLY,
      afterEnd,
    });
    assert.equal(periodStart.toISOString(), afterEnd.toISOString());
    assert.equal(periodEnd.toISOString(), addDays(afterEnd, 30).toISOString());
  });
});

describe('billing enums', () => {
  it('exposes stable status values', () => {
    assert.equal(INVOICE_STATUS.OPEN, 'open');
    assert.equal(INVOICE_STATUS.PAID, 'paid');
    assert.equal(PAYMENT_STATUS.PENDING, 'pending');
    assert.equal(PAYMENT_STATUS.APPROVED, 'approved');
    assert.equal(PAYMENT_METHOD.CASH, 'cash');
  });
});
