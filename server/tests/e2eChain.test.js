/**
 * End-to-end: register → profile → generate plan → today's workout.
 *
 * Uses the real AI_PROVIDER from env (production path). Set AI_PROVIDER=mock
 * only if you intentionally want an offline chain.
 */
require('../src/config/loadDotenv');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const {
  User,
  MemberProfile,
  WorkoutPlan,
  Exercise,
  WorkoutTemplate,
  AiDecision,
} = require('../src/database/models');
const { seedWorkoutTemplates } = require('../src/database/seedWorkoutTemplates');
const { seedExercises } = require('../scripts/seedExercises');

const PROFILE_BODY = {
  age: 28,
  sex: 'male',
  weightKg: 78,
  heightCm: 178,
  fitnessGoal: 'muscle_gain',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: 3,
  sessionDurationMinutes: 60,
  equipmentAvailable: [
    'barbell',
    'dumbbell',
    'bench',
    'cable_machine',
    'machine',
    'pull_up_bar',
    'bodyweight',
  ],
  limitations: [],
};

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

describe('E2E chain: register → profile → generate → today', () => {
  /** @type {import('http').Server} */
  let server;
  /** @type {string} */
  let baseUrl;
  /** @type {string} */
  let email;
  /** @type {string|undefined} */
  let userId;
  /** @type {string|undefined} */
  let profileId;

  before(async () => {
    const uri =
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gym-trainer-test';

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
      });
    }

    const [exerciseCount, templateCount] = await Promise.all([
      Exercise.countDocuments(),
      WorkoutTemplate.countDocuments({ isActive: true }),
    ]);
    if (templateCount < 3) {
      await seedWorkoutTemplates();
    }
    if (exerciseCount < 40) {
      await seedExercises();
    }

    const app = createApp();
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
    email = `e2e.chain.${Date.now()}@example.com`;
  });

  after(async () => {
    try {
      if (profileId) {
        await WorkoutPlan.deleteMany({ memberId: profileId });
        await AiDecision.deleteMany({ memberId: profileId });
        await MemberProfile.deleteOne({ _id: profileId });
      }
      if (userId) {
        await User.deleteOne({ _id: userId });
      } else if (email) {
        await User.deleteOne({ email });
      }
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  });

  it('runs the full happy path', async () => {
    const password = 'TestPass123!';

    const registered = await request(baseUrl, 'POST', '/api/auth/register', {
      body: { email, password },
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    assert.equal(registered.body.success, true);
    assert.ok(registered.body.data.token);
    assert.equal(registered.body.data.user.email, email.toLowerCase());
    userId = registered.body.data.user.id;
    const token = registered.body.data.token;

    const profileRes = await request(baseUrl, 'PUT', '/api/profile', {
      token,
      body: PROFILE_BODY,
    });
    assert.equal(profileRes.status, 200, JSON.stringify(profileRes.body));
    assert.equal(profileRes.body.success, true);
    assert.equal(profileRes.body.data.profile.fitnessGoal, 'muscle_gain');
    assert.equal(profileRes.body.data.profile.trainingDaysPerWeek, 3);
    profileId = profileRes.body.data.profile._id;

    const generateRes = await request(baseUrl, 'POST', '/api/workouts/generate', {
      token,
    });
    assert.equal(generateRes.status, 201, JSON.stringify(generateRes.body));
    assert.equal(generateRes.body.success, true);
    const plan = generateRes.body.data.plan;
    assert.ok(plan._id);
    assert.equal(plan.isActive, true);
    assert.equal(plan.status, 'active');
    assert.ok(Array.isArray(plan.days));
    assert.ok(plan.days.length >= 1);
    assert.ok(plan.days[0].exercises.length >= 1);

    const todayRes = await request(baseUrl, 'GET', '/api/workouts/today', {
      token,
    });
    assert.equal(todayRes.status, 200, JSON.stringify(todayRes.body));
    assert.equal(todayRes.body.success, true);
    assert.equal(String(todayRes.body.data.planId), String(plan._id));
    assert.ok(typeof todayRes.body.data.isRestDay === 'boolean');
    assert.ok(Array.isArray(todayRes.body.data.exercises));
    assert.ok(todayRes.body.data.dayOfWeek);
    if (!todayRes.body.data.isRestDay) {
      assert.ok(todayRes.body.data.exercises.length >= 1);
    }
  });

  it('rejects generate without a profile', async () => {
    const lonelyEmail = `e2e.noprofile.${Date.now()}@example.com`;
    const password = 'TestPass123!';

    const registered = await request(baseUrl, 'POST', '/api/auth/register', {
      body: { email: lonelyEmail, password },
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const lonelyUserId = registered.body.data.user.id;
    const token = registered.body.data.token;

    try {
      const generateRes = await request(baseUrl, 'POST', '/api/workouts/generate', {
        token,
      });
      assert.equal(generateRes.status, 404, JSON.stringify(generateRes.body));
      assert.match(
        String(generateRes.body.error?.message || ''),
        /profile/i
      );

      const todayRes = await request(baseUrl, 'GET', '/api/workouts/today', {
        token,
      });
      assert.equal(todayRes.status, 404, JSON.stringify(todayRes.body));
      assert.match(
        String(todayRes.body.error?.message || ''),
        /profile/i
      );
    } finally {
      await User.deleteOne({ _id: lonelyUserId });
    }
  });
});
