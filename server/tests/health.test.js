const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

describe('health endpoint', () => {
  it('GET /health and /api/health return ok', async () => {
    const app = createApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      for (const path of ['/health', '/api/health']) {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.status, 'ok');
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
