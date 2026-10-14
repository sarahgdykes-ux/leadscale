# Shared Contract

## Active Contracts

The frozen normalized `Lead`, `Assessment`, prioritization logic, and result schemas live under `lib/types/lead.ts` and `lib/agent/prioritize.ts`. The repository seeds six demo leads with dates relative to the current time.

`GET /api/leads?offset=0&limit=12` returns at most 12 desk-safe leads. Pagination metadata is returned in `x-total-count`, `x-page-offset`, and `x-page-limit`; raw intake payloads are omitted. `POST /api/prioritize` accepts `{}` for up to 12 leads or `{ "leadIds": ["..."] }` for a selected subset. The `leads` property is not accepted. The desk requests and prioritizes one page at a time.

Prioritize results contain ranked `{ lead, assessment }` entries, rejected entries, and source/flag/adjustment metadata. Assessments are deterministically constrained to the pre-score, and cache keys include lead contents, runtime mode/model, current prompt/scoring/filter configuration, and derived flags.

## Intake and Persistence

CSV, manual, and Resend email intake are implemented under `lib/intake/` and `src/app/api/intake/`. Intake normalizes records with server-generated IDs and returns actual `saved`, `merged`, and `skipped` counts. Distinct inquiries remain distinct even when contact details match; duplicate flags are computed by the prioritization harness.

The `LeadRepository` interface has in-memory and Supabase implementations under `lib/data/`. Supabase writes leads with primary-key upserts. Email webhook verification uses Svix signatures, a configured forwarding-sender allowlist, SPF/DKIM results, event idempotency, and stale-pending recovery.

## Agent Retrieval Tool

- Name: `get_lead`.
- Input: `{ "leadId": "<string>" }`; IDs are not constrained to UUIDs.
- Output: a `found`/`not_found` union.
- Each lead invocation receives a tool bound to that one lead ID. Model-visible data excludes name, email, and phone values; it includes contact-presence booleans.
- Untrusted message and property text is delimiter-wrapped. The tool does not return raw intake data.

## Legacy Scaffolding

The older files under `src/contracts/`, `src/agent/`, `src/adapters/`, `src/harness/`, `src/data/`, and `src/lib/` are legacy scaffolds and are not the active contracts or repository path. Use the corresponding `lib/` modules and `src/app/api/` handlers. The current lead-detail route reads the active repository and returns `{ "lead": Lead, "assessment"?: Assessment }`.

## Production Boundaries

The browser must not receive `ROUTE_SHARED_SECRET`; production desk access still needs a trusted session or authenticated server proxy. Live Strands, Supabase, and Resend behavior has not been verified against configured services. Agree on a data-retention schedule and a shared rate-limit store before production deployment. See `docs/DEPLOYMENT.md`.