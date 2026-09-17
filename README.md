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

Default provider is **Gemini**. On HTTP 429 (quota), 404 (retired model), or
503 (overload) the gateway cools that model down and shifts to the next entry
in `AI_MODELS`.

Request/response follow the GymAI exercise-science research doc:
- System prompt: split selection, goal→sets/reps/rest/RPE, weekly volume, injury substitutions, deload
- User prompt builder: `buildAiRequestPrompt({ intake, catalogue, candidatePlan })`
- Contract columns: sets/reps, restSeconds, rpe (coerced), formCue, progressionCue, substitutionNote

```js
const { generateCompletion, buildAiRequestPrompt } = require('./src/ai');
const { parseAiOutput } = require('./src/contracts/aiOutputContract');

const prompt = buildAiRequestPrompt({ intake, catalogue, candidatePlan });
const { text, modelVersion } = await generateCompletion({ prompt });
const result = parseAiOutput(JSON.parse(text));
```

Manual smoke: `node scripts/smokeAiGateway.js`
| Env | Default | Notes |
|-----|---------|-------|
| `AI_PROVIDER` | `gemini` | `gemini` \| `groq` \| `openai_compatible` \| `mock` |
| `AI_API_KEY` | — | Gemini API key from Google AI Studio |
| `AI_MODEL` | `gemini-3.6-flash` | Preferred first model |
| `AI_MODELS` | `gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.1-flash-lite` | Shift order on limit / unavailable |
| `AI_BASE_URL` | Gemini OpenAI-compat URL | Override only if needed |
| `AI_TIMEOUT_MS` | `30000` | Per-request abort |

CI uses the mock provider (no network). Set `AI_API_KEY` locally to exercise live Gemini.
