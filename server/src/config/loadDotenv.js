/**
 * Load .env from server/ and repo root.
 * `require('dotenv/config')` only checks process.cwd(), so running
 * `npm test` / `npm run dev` from server/ misses the root `.env` file.
 */
const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadDotenv() {
  if (loaded) return;
  loaded = true;

  // Prefer server/.env when present; root .env fills any gaps (dotenv does not override).
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

loadDotenv();

module.exports = { loadDotenv };
