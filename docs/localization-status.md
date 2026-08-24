# Localization status

English and Spanish are wired end to end. **All non-legal consumer-visible UI is localized.**

## Coverage

| Surface | Status |
|---|---|
| Screens and components (`app/`, `components/`) | **0 remaining** — 47 files localized |
| Non-component modules (`lib/`) | **0 remaining** — 11 modules use the runtime mirror |
| Legal documents | **NOT translated** — hard Production blocker, see below |

Verified by a whole-tree sweep in `lib/__tests__/i18n.test.ts`, which walks every `.tsx` under `app/`
and `components/` and fails on any consumer-visible English literal. It was confirmed to fail when
one is reintroduced.

## How it is built

- **Keys**: flat and semantic, English canonical, Spanish a translation of it. 380 keys, exact parity.
- **Fallback**: a missing Spanish key renders English, never a blank and never a raw key.
- **Formatting**: `Intl` for dates, numbers, currency, percentages and plural selection, at `es-US`
  so a U.S. consumer sees U.S. money and U.S. date order.
- **Components** use `useI18n()`, which is reactive.
- **Non-component modules** use `tr()` from `lib/i18n/runtime.ts`, a mirror the provider keeps in
  step. Alert bodies, upload errors and status labels live in plain `.ts` files that cannot call a
  hook; threading a locale through their signatures would move a display concern into business APIs.
  Components must not read the mirror — it is not reactive.

## Legal documents — NOT translated

All eight in-app legal documents (~4,194 words, 56 sections) remain **English only**. While the app
is in Spanish, the document viewer shows a notice saying so.

**This is a hard Production blocker.** The Spanish legal copy requires review and approval by a
qualified bilingual attorney. Machine translation of terms, a privacy policy or a credit disclosure
must not be presented to a consumer as final. Version identifiers, effective dates, headings and
contact details must survive translation unchanged; the acceptance record already stores which
locale was displayed, so the audit trail is ready for translated documents when they exist.

## Adding a string

1. Add the key to `lib/i18n/en.ts`, then its Spanish counterpart in `lib/i18n/es.ts`.
2. Use `t('key')` in a component, or `tr('key')` in a non-component module.
3. Add non-component modules to `RUNTIME_MODULES` in `lib/__tests__/i18n.test.ts`.

Parity fails if either side is missing a key. The sweep fails if a literal is left in JSX.
