# Zoey API

Serverless endpoints backing the Documents screen's analysis flow. Deploys on
Vercel via the `api/` file convention (files prefixed `_` are ignored by the
builder, so `_lib/` and `_dev-server.ts` are not routes).

## Running locally

```bash
npm run api          # http://localhost:3000
```

No Vercel account or CLI needed — Node 24 strips TypeScript natively, so
`api/_dev-server.ts` hosts the same handlers Vercel deploys. That is also why
every file here sticks to erasable syntax (no `enum`, no parameter properties)
and imports with explicit `.ts` extensions.

Point the app at it by copying `.env.example` to `.env.local`:

```bash
EXPO_PUBLIC_ZOEY_API_URL=http://192.168.x.x:3000
```

Use your machine's LAN IP, not `localhost` — on a physical device `localhost`
resolves to the phone itself.

**There is no fallback.** If the variable is unset the app reports a
configuration error rather than quietly trying `localhost:3000`, which only ever
worked on the developer's machine. `lib/api-config.ts` is the single resolver;
nothing else reads the variable or hardcodes a host.

## Deploying

> ### ⚠️ DO NOT LINK THIS REPO TO THE `the-wizard` VERCEL PROJECT
>
> This directory was previously linked to Vercel project **`the-wizard`**
> (`prj_QOiZEFpjnTb6zcKD6nI1sRPIvUZl`, team `the-wizards`). That is **not this
> project's deployment** — it is the Vercel project for
> `github.com/vmtdsbfj8y-oss/the-wizard`, which serves the Next.js owner
> dashboard, the client portal, `/api/credit/*` and the Lob certified-mail
> pipeline. It has live Production deployments.
>
> While that link existed, a single `vercel --prod` run from this directory
> would have replaced the engine's Production deployment with this API-only
> stub, taking the dashboard, the portal and the mailing pipeline offline.
>
> The local link has been removed. `vercel` from here now prompts for a project
> instead of silently targeting the engine.
>
> If this API ever needs hosting again, create a **separate** project (suggested
> name `zoey-app`). Never reuse the engine's project id, Git integration or
> domains.

`vercel.json` configures an **API-only** deployment: no framework build, static
root of `public/`, and the functions come from `api/` via the file convention
(`_`-prefixed files are ignored, so `_lib/` and `_dev-server.ts` are not routes).

One deployment of this API currently exists inside the engine's Vercel project,
at the `preview` URL below. It is left running so existing preview builds keep
working; it is not production and nothing here should be redeployed into that
project.

Per-environment app config lives in `eas.json`:

| profile | `EXPO_PUBLIC_ZOEY_API_URL` |
| --- | --- |
| `development` | `http://localhost:3000` |
| `preview` | an existing deployment of this API |
| `production` | placeholder — deliberately invalid |

The production entry is not a valid URL on purpose, so a release build made
before it is set fails with a clear configuration error instead of shipping a
broken base URL.

## Endpoints

### `POST /api/documents/upload`

Registers a document against an intake slot.

```jsonc
// body
{ "slotId": "proof-address", "filename": "utility-bill.pdf" }
// 200
{ "docId": "doc_...", "slotId": "proof-address", "receivedAt": 1700000000000 }
// 400 — { "error": "slotId is required" }
```

Records that a slot is filled; it does **not** accept file bytes. Real transfer
(multipart, or a signed direct-to-storage URL) is still to be built.

### `POST /api/analysis/start`

Opens a job. The required set is read from the server's own document record, so
a client cannot start analysis by claiming documents it never uploaded.

```jsonc
// body: {}
// 200
{ "jobId": "job_...", "startedAt": 1700000000000 }
// 409
{ "error": "Required documents are missing", "missing": ["credit-report"] }
```

Required slots: `ssn`, `photo-id`, `proof-address`, `credit-report`.
`optional-extras` is not required.

### `GET /api/analysis/:jobId`

The status the app polls (~900ms) until terminal.

```jsonc
// 200
{
  "jobId": "job_...",
  "status": "running",          // running | complete | failed
  "stages": { "received": "done", "extracting": "active", ... },
  "labels": { "received": "Documents Received", ... },
  "blockedReason": "..."        // only when failed
}
// 404 — { "error": "Unknown job" }
```

Stage state is one of `pending | active | done | failed`. Both the stage list
and its labels are server-owned, so adding or renaming a stage needs no app
release. App-side progress is `done / total` — it never interpolates.

## Storage

`_lib/store.ts` picks a backend at import time:

- **Upstash / Vercel KV** when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are
  set. Vercel injects both when you attach a KV store. Plain REST, no client
  library.
- **In-process `Map`** otherwise. Fine locally; on serverless it only holds for
  the life of a warm instance, so a job started on one instance can 404 on
  another. **Attach KV before this is used for anything real.**

## The stub

`_lib/pipeline.ts` → `deriveStages()` computes stage state from elapsed time
against fixed per-stage durations. Nothing reads a document. Deriving from
`startedAt` rather than mutating a row per tick is what makes it correct on
serverless — there is no background worker between requests, and any instance
can answer a status call without having handled the start.

When real analysis lands, replace `deriveStages` with a read of the job's actual
per-stage state. That function is the only thing that changes; the HTTP contract
and the entire app stay as they are.
