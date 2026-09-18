#!/usr/bin/env node
/**
 * Seed the Exercise collection with the Day 2 catalogue (idempotent by slug).
 *
 * Usage (from server/):
 *   npm run seed:exercises
 *
 * Options:
 *   --fresh  delete all exercises first (destructive)
 */
require('dotenv/config');

const path = require('path');
const mongoose = require('mongoose');

// Load .env from repo root or server/
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const connectDB = require('../src/database/connectDB');
const { Exercise } = require('../src/database/models');
const { EXERCISE_SEED } = require('../src/database/seeds/exercises');

async function seedExercises({ fresh = false } = {}) {
  await connectDB();

  if (fresh) {
    const deleted = await Exercise.deleteMany({});
    console.log(`🗑️  Removed ${deleted.deletedCount} existing exercises (--fresh)`);
  }

  const bySlug = new Map();

  for (const entry of EXERCISE_SEED) {
    const fields = { ...entry };
    delete fields.substitutionSlugs;
    const doc = await Exercise.findOneAndUpdate(
      { slug: fields.slug },
      {
        $set: {
          ...fields,
          // substitutions filled in a second pass
          approvedSubstitutions: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    bySlug.set(doc.slug, doc);
  }

  let linked = 0;
  for (const entry of EXERCISE_SEED) {
    const doc = bySlug.get(entry.slug);
    const subIds = (entry.substitutionSlugs || [])
      .map((slug) => bySlug.get(slug)?._id)
      .filter(Boolean);

    if (subIds.length === 0) continue;

    await Exercise.updateOne(
      { _id: doc._id },
      { $set: { approvedSubstitutions: subIds } }
    );
    linked += 1;
  }

  const total = await Exercise.countDocuments();
  console.log(`✅ Seeded ${EXERCISE_SEED.length} catalogue entries (${linked} with substitutions)`);
  console.log(`📦 Exercise collection now has ${total} documents`);
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  try {
    await seedExercises({ fresh });
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

module.exports = { seedExercises };
