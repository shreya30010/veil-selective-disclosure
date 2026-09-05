# VEIL

VEIL is a security console for scanning sensitive documents and applying accountable, role-based selective disclosure.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run typecheck` — check backend types
- `pnpm --filter @workspace/veil run typecheck` — check frontend types
- `PORT=21632 BASE_PATH=/ pnpm --filter @workspace/veil run build` — build the web artifact locally
- `tests/veil-smoke.sh` — smoke-test the running API through the shared proxy

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/veil/src/App.tsx` — responsive dashboard, scan, Disclosure Lens, and audit-log UI
- `artifacts/veil/src/index.css` — VEIL visual system and responsive layout utilities
- `artifacts/api-server/src/routes/veil.ts` — deterministic entity detection, risk scoring, disclosure policy, transforms, and in-memory audit log
- `lib/api-spec/openapi.yaml` — source of truth for the typed scan, transform, disclosure, summary, demo, and audit APIs
- `lib/api-client-react/src/generated/` — generated React Query client
- `lib/api-zod/src/generated/` — generated server validation schemas
- `tests/veil-smoke.sh` — API smoke checks

## Architecture decisions

- The MVP intentionally uses deterministic regex/rule-based scanning so it works without an external AI key.
- Disclosure policy is enforced on the backend for both access tests and transformed document views.
- Audit entries store only role, resource category, action, result, and time; raw sensitive values are never logged.
- The audit log and latest scan are held in memory for the MVP, keeping the demo simple and avoiding a database dependency.
- The frontend consumes generated API hooks from the OpenAPI contract rather than duplicating request types.

## Product

VEIL detects people, contacts, locations, organizations, financial references, and confidential-source exposure; calculates a risk score; applies four disclosure roles; and records allowed or blocked disclosure attempts.

## User preferences

The requested product direction is a polished near-black/cyan/violet security-console experience with a fast fictional demo flow and no authentication.

## Gotchas

- The API server is mounted under `/api`; use the shared proxy at `localhost:80` for local curl checks.
- The in-memory audit log resets when the API workflow restarts; use a database before treating it as production retention.
- Re-run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
