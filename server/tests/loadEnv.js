/**
 * Preload repo-root / server .env before any test registers skip conditions.
 * Used by: npm test --require ./tests/loadEnv.js
 */
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
