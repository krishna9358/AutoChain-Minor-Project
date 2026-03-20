# Environment Variables

This document lists the active environment templates for local development.

## Frontend (`frontend/.env.local`)

Template: `frontend/.env.local.example`

- `NEXT_PUBLIC_BACKEND_URL` - Backend API base URL.
- `NEXT_PUBLIC_DEV_MODE` - Enable local demo auth shortcuts.
- `NEXT_PUBLIC_DEV_TOKEN` - Demo token used when dev mode is enabled.
- `NEXT_PUBLIC_APP_URL` - Public app URL for redirects/UI links.

## Backend (`primary-backend/.env`)

Template: `primary-backend/.env.example`

Core:
- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `KAFKA_BROKER`

AI generation and AI-backed executors:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_EMBEDDING_MODEL`

## Hooks (`hooks/.env`)

Template: `hooks/.env.example`

- `DATABASE_URL`
- `PORT`
- `KAFKA_BROKER`
- `NODE_ENV`

## Processor (`processor/.env`)

Template: `processor/.env.example`

- `DATABASE_URL`
- `KAFKA_BROKER`
- `NODE_ENV`
- `PROCESSOR_INTERVAL`

## Worker (`worker/.env`)

Template: `worker/.env.example`

- `DATABASE_URL`
- `KAFKA_BROKER`
- `NODE_ENV`
- `WORKER_CONCURRENCY`
- Optional SMTP vars for email actions.
- Optional `SOL_PRIVATE_KEY` for Solana-related flows.
