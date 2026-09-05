# VEIL

VEIL is an AI-powered selective disclosure workspace for journalists and organizations handling sensitive documents. It protects sensitive information without hiding the truth from authorized readers.

## Main features

- Deterministic privacy scanning for people, email, phone, location, organization, financial, and confidential-source entities.
- Calculated privacy exposure score with identity, location, contact, financial, and source-exposure risk breakdowns.
- Disclosure Lens with four roles: Public, Reporter, Editor, and Authorized Investigator.
- Backend-enforced role policy for both disclosure decisions and transformed document views.
- Audit log of allowed and blocked category-level disclosure attempts without raw sensitive values.
- Fictional demo investigation designed to run through scan, lens, access test, and audit review in under two minutes.

## Architecture

- Frontend: React + Vite with generated React Query hooks.
- Backend: Express 5 API server.
- Contract: OpenAPI in `lib/api-spec/openapi.yaml`, generating the client and Zod validation schemas.
- Storage: in-memory latest scan and audit log for this MVP. No external AI service or database is required.

## How to run

The Replit workflows start the API and web app automatically. For a local shell check:

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

The web workflow supplies the required `PORT` and `BASE_PATH` values. For a production-style frontend build:

```bash
PORT=21632 BASE_PATH=/ pnpm --filter @workspace/veil run build
```

## How to use the demo

1. Open **Scan document**.
2. Click **Load demo**, then **Scan document**.
3. Review detected entities and the calculated privacy exposure score.
4. Open **Disclosure Lens** and load the demo view.
5. Switch between Public, Reporter, Editor, and Authorized Investigator.
6. Test **Confidential source** as Public to see a blocked decision.
7. Switch to Authorized Investigator and test again to see an allowed decision.
8. Open **Audit log** to review both decisions without exposing the source value.

## Security limitations

- The scanner is deterministic pattern matching, not a complete DLP or NLP system.
- The MVP has no authentication or identity provider.
- The audit log is in memory and resets when the API process restarts.
- Demo data is fictional. Do not paste real sensitive documents into an unreviewed prototype deployment.
- Production use should add authenticated users, durable encrypted storage, retention controls, stronger entity detection, and an independent security review.

## Verification

Run the API smoke checks against a running workflow:

```bash
./tests/veil-smoke.sh
```