#!/usr/bin/env node
/**
 * Seed Plan collection (idempotent by slug).
 *
 * Usage (from server/):
 *   npm run seed:plans
 *
 * Options:
 *   --fresh  delete all plans first (destructive)
 */
require('../src/config/loadDotenv');

const mongoose = require('mongoose');

const connectDB = require('../src/database/connectDB');
const { Plan } = require('../src/database/models');
const { PLAN_SEED } = require('../src/database/seeds/plans');

async function seedPlans({ fresh = false } = {}) {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  if (fresh) {
    const deleted = await Plan.deleteMany({});
    console.log(`🗑️  Removed ${deleted.deletedCount} existing plans (--fresh)`);
  }

  for (const entry of PLAN_SEED) {
    await Plan.findOneAndUpdate(
      { slug: entry.slug },
      { $set: entry },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  if (!fresh) {
    const keepSlugs = PLAN_SEED.map((p) => p.slug);
    const pruned = await Plan.deleteMany({ slug: { $nin: keepSlugs } });
    if (pruned.deletedCount) {
      console.log(`🧹 Pruned ${pruned.deletedCount} plans not in seed`);
    }
  }

  const total = await Plan.countDocuments();
  console.log(`✅ Seeded ${PLAN_SEED.length} plans`);
  console.log(`📦 Plan collection now has ${total} documents`);
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  try {
    await seedPlans({ fresh });
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedPlans };
