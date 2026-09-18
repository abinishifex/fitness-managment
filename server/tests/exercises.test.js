const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EQUIPMENT_VALUES } = require('../src/config/constants');
const { EXERCISE_SEED, slugify } = require('../src/database/seeds/exercises');
const { createApp } = require('../src/app');

describe('Exercise seed catalogue', () => {
  it('contains 40–60 real exercises', () => {
    assert.ok(EXERCISE_SEED.length >= 40, `expected >= 40, got ${EXERCISE_SEED.length}`);
    assert.ok(EXERCISE_SEED.length <= 60, `expected <= 60, got ${EXERCISE_SEED.length}`);
  });

  it('has unique slugs and required fields', () => {
    const slugs = new Set();
    for (const ex of EXERCISE_SEED) {
      assert.equal(ex.slug, slugify(ex.name));
      assert.ok(ex.name);
      assert.ok(Array.isArray(ex.primaryMuscles) && ex.primaryMuscles.length > 0);
      assert.ok(Array.isArray(ex.equipmentRequired) && ex.equipmentRequired.length > 0);
      assert.ok(Array.isArray(ex.formCues));
      assert.equal(typeof ex.instructions, 'string');
      assert.equal(ex.isApproved, true);
      assert.ok(['beginner', 'intermediate', 'advanced'].includes(ex.difficulty));
      assert.ok(['compound', 'isolation'].includes(ex.type));

      for (const eq of ex.equipmentRequired) {
        assert.ok(EQUIPMENT_VALUES.includes(eq), `invalid equipment: ${eq}`);
      }

      assert.equal(slugs.has(ex.slug), false, `duplicate slug: ${ex.slug}`);
      slugs.add(ex.slug);
    }
  });

  it('substitution slugs point at other seed entries', () => {
    const slugs = new Set(EXERCISE_SEED.map((ex) => ex.slug));
    for (const ex of EXERCISE_SEED) {
      for (const sub of ex.substitutionSlugs || []) {
        assert.ok(slugs.has(sub), `${ex.slug} references missing sub ${sub}`);
        assert.notEqual(sub, ex.slug);
      }
    }
  });
});

describe('Exercise routes mounted', () => {
  it('registers GET / and GET /:idOrSlug under /api/exercises', () => {
    const app = createApp();
    // Express 5 mount layers do not expose the path string; identify by child routes.
    const mount = app.router.stack.find((layer) => {
      if (layer.name !== 'router' || !layer.handle?.stack) return false;
      const paths = layer.handle.stack
        .filter((l) => l.route)
        .map((l) => l.route.path);
      return paths.includes('/') && paths.includes('/:idOrSlug');
    });
    assert.ok(mount, 'expected exercises router with / and /:idOrSlug');

    const methodsFor = (path) => {
      const layer = mount.handle.stack.find((l) => l.route?.path === path);
      return Object.keys(layer.route.methods);
    };
    assert.ok(methodsFor('/').includes('get'));
    assert.ok(methodsFor('/:idOrSlug').includes('get'));
  });
});
