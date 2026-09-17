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
