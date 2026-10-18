const { INTERVAL_DAYS } = require('../../billing/enums');

/**
 * Add calendar days to a date (UTC midnight-safe via Date math).
 * @param {Date|string|number} from
 * @param {number} days
 * @returns {Date}
 */
function addDays(from, days) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * @param {string} interval Plan interval enum value
 * @returns {number}
 */
function daysForInterval(interval) {
  const days = INTERVAL_DAYS[interval];
  if (!days) {
    throw new Error(`Unknown plan interval: ${interval}`);
  }
  return days;
}

/**
 * Build the next billing period after `afterEnd` (exclusive start = afterEnd).
 * First period: start = startDate, end = start + intervalDays.
 *
 * @param {{ startDate: Date, interval: string, afterEnd?: Date|null }} opts
 * @returns {{ periodStart: Date, periodEnd: Date, dueDate: Date }}
 */
function nextPeriod({ startDate, interval, afterEnd = null }) {
  const days = daysForInterval(interval);
  const periodStart = afterEnd ? new Date(afterEnd) : new Date(startDate);
  const periodEnd = addDays(periodStart, days);
  // Due on period start (pay for the upcoming period).
  const dueDate = new Date(periodStart);
  return { periodStart, periodEnd, dueDate };
}

module.exports = {
  addDays,
  daysForInterval,
  nextPeriod,
};
