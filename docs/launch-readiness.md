# Zoey B12.5 — Pre-Apple launch readiness (internal)

Audited against the deployed Preview build on 2026-08-20. Every outstanding item appears exactly
once, under exactly one category.

## READY_NOW

- Consumer navigation: no dead buttons (0 `Pressable` without `onPress` across the app), no fake
  states, no debug or admin text on any consumer screen.
- Auth and isolation: unauthenticated and invalid-token requests rejected on every mobile route;
  owner routes reject consumer-style access; owner credentials cannot substitute for a consumer
  session.
- Scores: no fabricated, averaged or default score constants exist. Missing means unavailable.
- Documents: 4 MB limit matches the platform reality, magic-number validation, private storage,
  photo compression, PDFs never recompressed.
- Analysis: lifecycle gates, run lock with TTL, honest `BLOCKED / READING_DOCUMENTS` behaviour, no
  automatic approval and no automatic mailing.
- Zoey Chat: real authenticated endpoint, sanitized context, no tools, no database access, no
  authority to sign or mail. AI disclosure reachable from the chat screen.
- Disputes: approval and mailing are separate gates; mailing additionally requires a matching packet
  hash, a locked return address and a live provider key. No "sent" or "tracking" vocabulary exists on
  the consumer surface at all.
- Notifications: preferences persist per account; delivery is truthfully `NOT_IMPLEMENTED`; no push
  token; no OS prompt; the header bell is no longer a fake unread indicator.
- Legal and privacy: eight documents reachable signed-out, official support address wired, account
  deletion easy to find, no absolute deletion promise, no outcome guarantees.
- Security: public-route allowlist, owner session with CSRF origin checks, human/machine credential
  separation, Postgres-backed distributed rate limiting, deletion tombstones, `private, no-store`
  caching, seven security headers live, `next/image` host allowlist, engine runtime advisories 0.

## NEEDS_PINNACLE_WEBSITE

Nothing. The site is live at `pinnaclecapitalusa.com` — homepage, `/zoey`, `/privacy`, `/terms`,
`/support`, `/privacy-choices` — with a real 404 on unknown paths, `http://` redirecting to `https://`,
and live hydration verified in WebKit (Safari) and Chromium at desktop and mobile widths. The Public
Privacy Policy, Terms and Support URLs are **READY** for App Store Connect.

Email and `portal.pinnaclecapitalusa.com` were preserved through the cutover: MX still Google
Workspace, SPF and DKIM intact, portal still on its own Vercel project.

## NEEDS_APPLE_DEVELOPER_ACCOUNT

- App Store Connect record, bundle identifier registration, and the privacy questionnaire.
- Push notification capability and an APNs key, if notifications are ever built.

## NEEDS_STOREKIT

- In-app purchase, restore purchases, manage subscription, and receipt/entitlement verification.
  None of these exist today; see the subscription section below.

## NEEDS_PRODUCTION_CONFIG

- The full Preview → Production configuration set. Names only, in the manifest below.

## NEEDS_TESTFLIGHT

- Real-device acceptance of the whole consumer journey on a production build.
- Confirmation of what a release build collects for crash/performance diagnostics, which is an open
  answer in the App Store privacy worksheet.

## NEEDS_COUNSEL_REVIEW

Ten items, derived from the documents themselves rather than kept as a separate list:

1. Privacy Policy — subprocessor list and legal entity names.
2. Privacy Policy — retention schedule and periods.
3. Privacy Policy — state-specific privacy rights, verification and appeal process.
4. Terms — membership, billing, renewal, refund and cancellation terms.
5. Terms — warranties and limitation of liability (**not drafted**).
6. Terms — governing law, venue, arbitration, class-action waiver (**not drafted**).
7. Dispute Services — CROA and state credit-services-organization applicability.
8. Data & Privacy Choices — portability response requirements.
9. Account Deletion — consumer-facing retention wording.
10. Contact & Support — public support page requirement.

## TRACKED_NON_BLOCKING_TECH_DEBT

- **Genuine sanitized IdentityIQ PDF fixture is still absent.** The PDF.js runtime is proven working
  on deployed Preview (9/9 pages, 4,649 characters extracted), but no real-format IdentityIQ export
  with PII replaced in place has ever been run through the parser. The synthetic fixture is a *text*
  fixture rendered to PDF, and re-extraction does not reproduce the column geometry the analyser
  keys on, so structure detection, tradeline extraction and score extraction remain unexercised
  end to end. This gap predates the Next 15 migration and is not caused by it.
- **`components/screen-stub.tsx` is dead code.** A "Placeholder for the screens not built yet"
  component with no remaining import. Not rendered, so no consumer sees it; safe to delete.
- **`image-size` advisory chain (8 HIGH).** Reachable only through
  `expo → @expo/metro → metro → image-size`, i.e. the bundler that runs on the build machine and
  does not ship in the iOS binary. **No fixed version exists at any release**; npm's only remedy is
  Expo 57, a major SDK upgrade. Revisit at the next SDK upgrade.
- **Settings "Password & sign-in" row** is marked "Not available yet" while its own subtitle says
  password reset is available from the sign-in screen. Honest but self-contradicting; in-app password
  change is the missing feature.

## Production configuration manifest — NAMES ONLY

Nothing here is configured by this task, and no values appear anywhere in this document.

### Mobile app — client-visible, embedded in the shipped bundle

Anything prefixed `EXPO_PUBLIC_` is readable by anyone with the app. Never put a secret here.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_ZOEY_API_URL`
- `EXPO_PUBLIC_ZOEY_ENGINE_URL`

### App API project — server-only

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — legitimately required: deleting a Supabase auth user cannot be done
  with the publishable key, and account deletion depends on it. App project only.
- `REDIS_URL` — profile, goals, scores and membership store.
- `ZOEY_ENGINE_URL`
- `ZOEY_OWNER_LOGIN_SECRET` — human owner sign-in, exchanged for a session cookie.
- `ZOEY_MACHINE_OWNER_KEY` — machine-to-machine only, header only, never a cookie or URL.

### Engine project — server-only

- `DATABASE_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — consumer token verification.
  **`SUPABASE_SERVICE_ROLE_KEY` is deliberately NOT present on the engine and must not be added.**
- `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `PINNACLE_DOCS_STORE_ID` — private document storage.
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` — Zoey Chat.
- `LOB_API_KEY`, `LOB_LIVE_SEND_ENABLED`, `LOB_WEBHOOK_SECRET` — certified mail.
- `AUTOMATION_API_KEY` — automation routes.
- `ZOEY_APP_API_BASE_URL`, `ZOEY_MACHINE_OWNER_KEY`, `ZOEY_SELF_SIGNUP_OWNER_ID`
- `PINNACLE_IDENTITY_FINGERPRINT_SECRET`
- `PINNACLE_LEGAL_ENTITY_NAME`, `PINNACLE_BUSINESS_ADDRESS`, `PINNACLE_AUTHORIZED_SIGNER_NAME`,
  `PINNACLE_AUTHORIZED_SIGNER_TITLE`, `PINNACLE_MA_SERVICE_AGENT_NAME`,
  `PINNACLE_MA_SERVICE_AGENT_ADDRESS`, `PINNACLE_CONTRACT_LAUNCH_APPROVED`
- `PINNACLE_PORTAL_BASE_URL`
- `RESEND_API_KEY`
- `AI_CREDIT_REASONER_ENABLED` — **must remain unset or false. The reasoner stays in SHADOW.**

## Subscription — what exists today

| Capability | State |
|---|---|
| Entitlement gating | **Works.** `membership: free \| active` is the app's source of truth, server-side, per account, and fails closed when an `activeUntil` has passed. |
| Billing status reporting | **Works, honestly.** `/api/subscription` returns `not_connected` — distinct from `none` — because no billing provider has been asked. The screen says so and states explicitly that it shows no placeholder pricing. |
| Granting membership | Owner-set only, through the admin portal. |
| Purchase | **Absent.** NEEDS_STOREKIT. |
| Restore purchases | **Absent.** NEEDS_STOREKIT. |
| Manage subscription | Renders a provider portal link only when one exists; otherwise says payment changes go through support. No Apple management path. NEEDS_STOREKIT. |
| Receipt / entitlement verification | **Absent.** NEEDS_STOREKIT. |

Nothing in the app claims an Apple subscription occurred, and no code path can set membership from a
client request.
