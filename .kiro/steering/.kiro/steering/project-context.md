# Project Context — Gym Planner Backend

## Stack
- Node.js (Express)
- MongoDB (Mongoose)
- JWT Authentication
- Zod for validation

## Project Structure
- server/ → backend API root (all backend work happens here)
- server/src/database/models/ → existing Mongoose models (User, MemberProfile, Exercise, WorkoutTemplate, AiDecision, WorkoutPlan, WorkoutLog, Progress) — already built, do not modify
- server/src/database/connectDB.js → MongoDB connection

## Core Features (this MVP, workout-only)
- User authentication (register, login, JWT)
- Member profile + onboarding
- Deterministic workout rules engine + AI-assisted plan generation
- Daily workout delivery and logging (sets, reps, weight)
- Progress tracking (streaks, bests)
- Plan adaptation based on logged history

## Explicitly Out of Scope for This MVP
- Nutrition, meal plans, food database
- True offline-first (IndexedDB/Dexie, service worker, background sync)
- Payments, QR check-in, payroll, POS, AI chatbot

## Architecture Principle
AI recommends; backend rules validate. No AI-generated workout plan is ever saved
without first passing the Safety Validator (equipment check, approved-exercise check,
volume limits, injury/limitation checks).

## Coding Rules
- CommonJS (require/module.exports)
- async/await, no callbacks
- Validate all input with Zod
- Keep controllers separate from routes; no business logic inside route handlers
- Use ObjectId references between collections, not strings
- Workout log writes must be idempotent — check the client-supplied mutationId
  before inserting, to prevent duplicate logs from retried requests

## What to Avoid
- Do NOT modify existing files in server/src/database/models/
- Do NOT mix frontend and backend code
- Do NOT implement offline-sync/service-worker infrastructure — descoped for this MVP