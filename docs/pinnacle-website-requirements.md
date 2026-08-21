# Pinnacle website — pages Zoey needs (internal)

Not built in this task. This is the list of what the future Pinnacle site must carry for Zoey to be
submittable and for the in-app documents to have a public home.

## Required before App Store submission

| Page | Why it is required | Source of content |
|---|---|---|
| **Privacy Policy** | Apple requires a publicly reachable Privacy Policy URL in App Store Connect. It must be readable without an account. | `lib/legal/privacy.ts` — publish the same text the app renders |
| **Terms of Use** | Referenced by the in-app acknowledgement at signup and expected for a paid financial service. Must be readable by someone deciding whether to sign up. | `lib/legal/terms.ts` |
| **Support / Contact** | Apple requires a support URL. Must include a monitored contact method. | Needs a monitored support email address — none exists today |
| **Zoey product page** | The destination an App Store listing links to, and where the marketing claims live. | New copy — must follow the same no-guarantee rules as the app |

## Recommended, not strictly required

| Page | Why |
|---|---|
| **Data & privacy request information** | Where a consumer who is not signed in — including someone who has deleted their account — goes to ask a privacy question or request a copy of their data. The in-app page assumes a session; this one cannot. |
| **AI Disclosure** | Referenced from the product page. Consumers evaluating an AI-assisted credit tool ask this before installing. |
| **Credit Information Disclaimer / Dispute Services Disclosure** | Any outcome claim made in marketing needs the same qualifications the app carries. Marketing copy is where guarantee language reappears. |

## Rules the website copy must follow

These are the same constraints applied to the app, and marketing pages are where they are most often
broken:

- No guaranteed score increase, deletion, approval, funding, or timeline.
- No "we fix your credit" or "we remove negative items" framing.
- No claim that a collection must be deleted, that an original contract is always required, or that a
  missed deadline forces deletion.
- No "we never share your data" — service providers process it; the distinction from selling is what
  the policy explains.
- No absolute security claims ("100% confidential", "military-grade", "unhackable").
- Do not describe Zoey as a law firm, lender, credit bureau, financial advisor, or attorney.

## Publishing model

One source of truth. The documents in `lib/legal/` are structured data with versions specifically so
the website can render the same words the app shows. A second hand-written copy on the website will
drift, and the version identifier stored with a consumer's acceptance will then point at wording that
no longer exists anywhere.
