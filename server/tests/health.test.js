const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

describe('health endpoint', () => {
  it('GET /health returns ok', async () => {
    const app = createApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'ok');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
