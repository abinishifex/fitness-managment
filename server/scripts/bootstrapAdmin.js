#!/usr/bin/env node
/**
 * Create or promote the first admin user (needed so Dev 1 can test cash).
 *
 * Usage (from server/):
 *   node scripts/bootstrapAdmin.js --email admin@gym.local --password 'ChangeMe123!' --phone +251911000000
 *
 * If the email exists, role is set to admin and password is reset.
 */
require('../src/config/loadDotenv');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/database/connectDB');
const { User } = require('../src/database/models');

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

async function main() {
  const email = (arg('email') || process.env.BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase();
  const password = arg('password') || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const phone = (arg('phone') || process.env.BOOTSTRAP_ADMIN_PHONE || '').replace(/\s+/g, '');

  if (!email || !password) {
    console.error('Usage: node scripts/bootstrapAdmin.js --email EMAIL --password PASS [--phone PHONE]');
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email });

  if (user) {
    user.role = 'admin';
    user.passwordHash = passwordHash;
    user.isActive = true;
    if (phone) user.phone = phone;
    await user.save();
    console.log(`✅ Promoted existing user to admin: ${email}`);
  } else {
    user = await User.create({
      email,
      passwordHash,
      phone: phone || null,
      role: 'admin',
    });
    console.log(`✅ Created admin: ${email}`);
  }

  console.log(`   id: ${user._id.toString()}`);
}

main()
  .catch((err) => {
    console.error('bootstrapAdmin failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
