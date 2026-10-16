/**
 * Seed gym membership plans (idempotent by slug).
 */
const PLAN_SEED = [
  {
    name: 'Monthly',
    slug: 'monthly',
    description: 'Full gym access, billed every 30 days.',
    price: 1500,
    currency: 'ETB',
    interval: 'monthly',
    isActive: true,
    sortOrder: 10,
  },
  {
    name: 'Quarterly',
    slug: 'quarterly',
    description: 'Full gym access for 90 days. Better value.',
    price: 4000,
    currency: 'ETB',
    interval: 'quarterly',
    isActive: true,
    sortOrder: 20,
  },
  {
    name: 'Yearly',
    slug: 'yearly',
    description: 'Full gym access for a year.',
    price: 14000,
    currency: 'ETB',
    interval: 'yearly',
    isActive: true,
    sortOrder: 30,
  },
];

module.exports = { PLAN_SEED };
