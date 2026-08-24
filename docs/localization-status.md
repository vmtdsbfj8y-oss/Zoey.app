# Localization status

English and Spanish are wired end to end. The **foundation is complete**; **UI string coverage is not**.

## Done

- Typed i18n core: resources, fallback, interpolation, plurals, `Intl` dates/numbers/currency/percent
- Device-locale detection, saved-preference precedence, per-account local cache
- Server persistence (`StoredProfile.locale`), validated against a closed set
- Language picker in Settings and during sign-up; switching applies immediately
- Chat locale sent, validated at the engine boundary, honoured in the reply
- Legal acceptance records the locale it was displayed in
- Screens localized: `app/(tabs)/_layout.tsx`, `app/chat.tsx`, `app/legal/[doc].tsx`, `app/legal/index.tsx`, `app/settings.tsx`, `app/sign-in.tsx`

## Remaining

**221 consumer-visible strings across 41 files.** Counts are approximate
(JSX text nodes plus common string props) and are a work estimate, not an exact key list.

| File | Approx. strings |
|---|---|
| `components/results/case-command-center.tsx` | 19 |
| `components/documents/zoey-hero.tsx` | 17 |
| `components/results/dispute-signature.tsx` | 13 |
| `app/(tabs)/index.tsx` | 12 |
| `app/signed-acknowledgment.tsx` | 11 |
| `app/goals.tsx` | 10 |
| `app/(tabs)/credit-score.tsx` | 9 |
| `app/(tabs)/more.tsx` | 9 |
| `app/subscription.tsx` | 8 |
| `app/membership.tsx` | 8 |
| `app/credit-services.tsx` | 8 |
| `components/credit/credit-modules.tsx` | 8 |
| `components/results/result-views.tsx` | 8 |
| `components/results/inquiry-questionnaire.tsx` | 8 |
| `app/welcome.tsx` | 6 |
| `app/(tabs)/documents.tsx` | 6 |
| `components/onboarding/consent-flow.tsx` | 6 |
| `components/home/credit-score-card.tsx` | 4 |
| `app/(tabs)/disputes.tsx` | 3 |
| `components/home/dispute-rounds-card.tsx` | 3 |
| `components/credit-services/intake-row.tsx` | 3 |
| `components/credit-services/certified-mailing.tsx` | 3 |
| `components/disputes/free-dispute-status.tsx` | 3 |
| `components/link/connect-account.tsx` | 3 |
| `components/documents/simple-service-status.tsx` | 3 |
| `components/documents/upload-zone.tsx` | 3 |
| `components/premium/premium-lock.tsx` | 3 |
| `app/upload.tsx` | 2 |
| `app/reset-password.tsx` | 2 |
| `app/connect-existing-file.tsx` | 2 |
| `components/tab-fab.tsx` | 2 |
| `components/home/progress-gauge-card.tsx` | 2 |
| `components/home/zoey-header.tsx` | 2 |
| `components/credit/credit-hero.tsx` | 2 |
| `components/credit/score-gauge.tsx` | 2 |
| `components/more/states.tsx` | 2 |
| `components/documents/document-row.tsx` | 2 |
| `components/screen-stub.tsx` | 1 |
| `components/chat/chat-parts.tsx` | 1 |
| `components/documents/analysis-steps.tsx` | 1 |
| `components/onboarding/onboarding-gate.tsx` | 1 |

## Legal documents — NOT translated

All eight in-app legal documents (~4,194 words, 56 sections) are still English. While the app is
in Spanish the document viewer shows a notice saying so, because presenting machine-translated
terms or a privacy policy as final would be worse than showing English.

**These require translation by a qualified bilingual attorney before launch, not by this pipeline.**
Version identifiers, effective dates, headings and contact details must survive translation
unchanged, and the acceptance record already stores which locale was displayed.

## How to continue

1. Add keys to `lib/i18n/en.ts`, then the Spanish counterpart in `lib/i18n/es.ts`.
2. Replace the literal with `t('key')` and add the file to `LOCALIZED` in `lib/__tests__/i18n.test.ts`.
3. The parity test fails if a Spanish key is missing, and the scan fails if a listed screen
   references a key that does not exist in English.
