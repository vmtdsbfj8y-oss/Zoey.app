# Bilingual visual & interaction polish audit

Rendered audit of the consumer app in English and Spanish. Every result below comes from a browser
that actually loaded the app — none of it is source inspection.

## How this was rendered, and the honest limit

**No iOS simulator was available on this machine.** `xcode-select` points at CommandLineTools, there
is no `Xcode.app`, `simctl` is not installed and there are zero simulator runtimes. That is a hard
blocker for iOS-native verification and it was not worked around.

What was used instead: **the real app, served by Expo for web (`react-native-web`)** at iPhone
viewport sizes, driven by a headless browser. The same components, the same localization layer, the
same navigation. What it does **not** reproduce is iOS text metrics, native font rendering, the iOS
keyboard, safe-area insets on a physical device, and `hitSlop` — which react-native-web does not
implement.

Because of that last one, both touch-target fixes were made to the **layout box** rather than
relying on `hitSlop`, so the target is real on every platform and measurable here.

`public/index.html` (the Vercel API landing page) shadows Expo's web entry, so it is moved aside for
the duration of a render session by `run-web.sh`, which restores it from an `EXIT INT TERM HUP` trap.
It was verified byte-identical to `HEAD` after every run.

## Coverage

| | |
|---|---|
| Routes rendered | 12 |
| Languages | English, Spanish |
| Viewports | 390×844 (small) and 430×932 (large), `deviceScaleFactor: 2` |
| Total renders | **48** |
| Screenshots captured | 48 |

Routes: `/`, `/sign-in`, `/reset-password`, `/legal`, and all eight legal documents
(`privacy`, `terms`, `ai-disclosure`, `credit-information`, `dispute-services`, `data-choices`,
`account-deletion`, `contact`).

## Automated checks per render

Horizontal overflow · clipped/ellipsised text · empty render · console errors · failed requests ·
touch targets below 44×44 · scrollability.

**Final result: zero findings on all 48 renders.**

## Defects found and fixed

### 1. Touch targets below 44×44 (3 controls)
- `sign-in` → "Legal & Privacy" / "Aviso Legal y Privacidad" — was 15pt tall
- legal document → "Also published at…" / "También publicado en…" — was 15pt tall
- legal document → `info@pinnaclecapitalusa.com` mailto row — was 40pt tall

Fixed with real padding (`py-4`, and `py-3.5` on the mailto row) plus `hitSlop`. Measured at ≥44pt
after the fix. The premium cosmic styling is unchanged — only vertical padding moved.

### 2. Hardcoded English accessibility labels (11)
Every one was a **template literal**, which no quoted-string scan could see:
`accessibilityLabel={\`Delete ${goal.title}\`}`. All were screen-reader labels — the strings a
sighted reviewer never notices are missing. Now `t(key, { values })` with interpolation.

Files: `goals`, `legal/index`, `legal/[doc]` ×2, `intake-row` ×2, `document-row` ×3,
`inquiry-questionnaire`, `premium-lock`.

### 3. Hardcoded English in JSX ternaries (~30 strings)
**Found by looking at a screenshot, not by a scan.** Spanish sign-in was shipping English tabs
("Sign In" / "Create Account") and an English divider ("or continue with email").

Fixed across 20 files including sign-in tabs, sign-out state, goals reopen/complete, subscription
billing labels, More descriptions, upload progress and retry, signature button states, dispute
result states, consent flow, connect account, and the Zoey hero ready state.

One apparent hit was **not** a defect and was reverted: `sectionFor()` returns
`'ACTIVE' | 'INQUIRY' | 'EVIDENCE' | …`, which is an internal type discriminator, not display copy.

## Guards added so these classes cannot return

Three new sweeps in `lib/__tests__/i18n.test.ts`, each written against the gap that let the defect
through:

1. **Template-literal props** — flags `prop={\`English ${x}\`}`; ignores templates that are pure interpolation.
2. **JSX ternaries** — flags `cond ? 'A' : 'B'` where either side is copy; ignores CSS classes, colours, icon names, single tokens, and `t(cond ? 'a.key' : 'b.key')`.
3. **Lowercase JSX text** — the original sweep required a capital first letter, so "or continue with email" was invisible to it.

## Interaction and persistence, verified live

| Behaviour | Result |
|---|---|
| Spanish device with no saved preference → Spanish | ✅ |
| Saved preference beats device language | ✅ |
| Preference survives reload (restart) | ✅ |
| Another account's cache key is not inherited | ✅ |
| Legal screens render in the selected language | ✅ |

## Visual identity

Preserved throughout: dark cosmic field, purple/black glow, translucent glass surfaces, the glowing
ZOEY treatment, and the hierarchy. No Expo default components were introduced and no decoration was
added.

## Remaining blockers

1. **No iOS simulator on this machine.** iOS-native rendering, the iOS keyboard, native safe areas
   and `hitSlop` behaviour are unverified. Requires a machine with Xcode.
2. **Authenticated routes were not rendered.** Dashboard, Documents, Credit Score, Goals,
   Subscription, Chat, Case Command Center, dispute signature and Settings all require a signed-in
   consumer. Verifying them needs a disposable account driven through Supabase auth in this
   environment, which this pass did not establish.
3. Legal documents remain English-only — a separate, already-tracked blocker requiring a qualified
   bilingual attorney.
