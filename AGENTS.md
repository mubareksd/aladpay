<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Alad (payment verify & checkout)

Integration follows https://alad.et/agents.md (not invented fields).

- API base: `https://api.alad.et`
- Server env: `ALAD_API_KEY` (never client-side)
- App proxies: `POST src/app/api/alad/verify` → `POST /api/v2/verify`; `POST src/app/api/alad/checkout/session` → `POST /api/v1/checkout/session`
- Verify body: `url` **or** `reference` + `bank`; sender = `account_number`; optional `settlement_account`, `expected_amount`, `phone` (CBE Birr)
- Checkout: required `success_url`, `failure_url`; optional `callback_url` → `/api/alad/webhooks/checkout`
- Types: `src/lib/alad/types.ts` matches the agents.md response envelope
