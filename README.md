# fitness-mgt

Gym Personal Trainer Platform — workout-only MVP (2-dev / 10-day plan).

## Stack

- Node.js + Express
- MongoDB Atlas + Mongoose (models already in `src/database/models`)
- Zod AI Output Contract (`src/contracts/aiOutputContract.js`)

## Setup

```bash
cp .env.example .env
# fill MONGODB_URI (and later JWT_SECRET / AI_API_KEY)
npm install
npm run dev
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API with `--watch` |
| `npm start` | Start API |
| `npm run lint` | ESLint |
| `npm test` | Node test runner |

## Health

`GET /health` → `{ success: true, data: { status: "ok" } }`

## AI Gateway (Dev2)

Single entry point: `generateCompletion({ prompt })` from `src/ai`.

```js
const { generateCompletion } = require('./src/ai');
const { parseAiOutput } = require('./src/contracts/aiOutputContract');

const { text, modelVersion } = await generateCompletion({ prompt });
const result = parseAiOutput(JSON.parse(text));
```

| Env | Default | Notes |
|-----|---------|-------|
| `AI_PROVIDER` | `groq` | `groq` \| `openai_compatible` \| `mock` |
| `AI_API_KEY` | — | Required for live calls |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Llama on Groq |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | OpenAI-compatible hosts |
| `AI_TIMEOUT_MS` | `30000` | Per-request abort |

CI uses the mock provider (no network). Set `AI_API_KEY` locally to exercise the live Groq path.
