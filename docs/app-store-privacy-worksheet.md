# App Store Connect — Privacy Worksheet (internal)

Built from the implementation, not from a template. Nothing here has been submitted to Apple, and
nothing should be entered into App Store Connect until the rows marked **NEEDS_DECISION** are
resolved by the company.

**Tracking:** Zoey contains no advertising SDK, no analytics SDK, no attribution SDK and no
cross-app identifier. Every row below is therefore `Tracking: No`. If an analytics or attribution
SDK is ever added, this worksheet and the Privacy Policy both change before it ships.

**Linked to identity:** everything Zoey stores is associated with an account, so where data is
collected it is linked.

| Apple category | Collected | Linked to identity | Tracking | Purpose | Where it lives |
|---|---|---|---|---|---|
| Contact Info — Name | Yes | Yes | No | App Functionality | Profile; mailing address on correspondence |
| Contact Info — Email Address | Yes | Yes | No | App Functionality | Supabase auth; profile |
| Contact Info — Phone Number | Yes | Yes | No | App Functionality | Profile (optional) |
| Contact Info — Physical Address | Yes | Yes | No | App Functionality | City/state in profile; full mailing address held engine-side for correspondence |
| Financial Info — Credit Info | Yes | Yes | No | App Functionality | Credit reports, scores, tradelines, inquiries |
| Financial Info — Payment Info | **NEEDS_DECISION** | — | No | — | No in-app purchase is wired today. If membership ships via Apple IAP, Apple processes payment and the app collects none. Confirm before submission. |
| Sensitive Info — Government ID | Yes | Yes | No | App Functionality | Uploaded photo ID, Social Security card document, proof of address — identity verification with bureaus |
| User Content — Photos or Videos | Yes | Yes | No | App Functionality | Photographs of identity documents taken or chosen in-app |
| User Content — Other User Content | Yes | Yes | No | App Functionality | Zoey Chat messages; supporting evidence; bureau/creditor letters; signed acknowledgments; goal notes |
| Identifiers — User ID | Yes | Yes | No | App Functionality | Supabase account identifier |
| Identifiers — Device ID | No | — | No | — | No device identifier is collected |
| Usage Data — Product Interaction | **UNKNOWN** | — | No | — | No product-analytics SDK is installed. Confirm no platform-level collection is enabled before answering. |
| Diagnostics — Crash / Performance Data | **NEEDS_DECISION** | — | No | App Functionality | No crash-reporting SDK is installed today. If EAS/Expo crash reporting is enabled for the production build, this becomes Yes. |
| Diagnostics — Other Diagnostic Data | Yes | Yes | No | App Functionality | Server-side request logs and error reports, including IP for rate limiting and abuse prevention |
| Location | No | — | No | — | Never requested. City/state is typed by the consumer, not derived from device location |
| Health & Fitness / Browsing History / Search History / Contacts / Purchases | No | — | No | — | Not collected |

## Answers that must not be guessed

- **Payment Info** — depends on whether membership launches through Apple IAP. Product decision.
- **Crash/performance data** — depends on the production build configuration. Verify what the
  release build actually enables rather than assuming.
- **Usage data** — currently believed to be none. Confirm against the shipped build.

## Required before submission, independent of this worksheet

1. A **public Privacy Policy URL**. Apple requires one in App Store Connect and it must be reachable
   without an account.
2. A **support URL**. No support page or monitored support address exists yet.
3. **Account deletion** — Apple requires apps offering account creation to offer in-app account
   deletion. Zoey does: Settings → Security & privacy → Delete account. This is implemented and
   proven working end to end.
4. An **age rating** consistent with a financial-services app for adults 18+.

## Notes for the reviewer-facing description

Zoey asks for a photograph of a government ID and, in some cases, a Social Security card document.
A reviewer will see these prompts. The in-app explanation of why they are needed, and the
Legal & Privacy documents, should be reachable from the sign-in screen without an account — they are.
