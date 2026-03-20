# Documentation Index

This folder contains implementation and usage docs for the current workflow system.

## Start here

- `docs/QUICK_START.md` - Fast onboarding for builder usage.
- `docs/NODE_REFERENCE.md` - Full node-by-node parameter reference.
- `docs/ENVIRONMENT_VARIABLES.md` - Active env vars and templates by service.
- `docs/AI_AGENT_MEMORY_AND_SECRET_SELECTOR_FEATURES.md` - AI memory + secret selector notes.
- `docs/DATETIME_PICKER_FEATURE.md` - Datetime picker behavior and UX details.

## Environment and setup

- Frontend env template: `frontend/.env.local.example`
- Backend env template: `primary-backend/.env.example`
- Hooks env template: `hooks/.env.example`
- Processor env template: `processor/.env.example`
- Worker env template: `worker/.env.example`

## Notes

- Workflow AI generation now uses OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`).
- Generation includes template fallback when LLM output is invalid.
- Workspace-scoped data isolation is enforced for workflows/secrets.
