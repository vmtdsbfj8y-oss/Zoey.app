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

## Native iOS pass (Xcode 26.6, iOS 26.5)

The simulator blocker is resolved and the signed-out surfaces have now been rendered **natively**,
which the web pass could not do. Xcode 26.6, iOS 26.5 runtime, iPhone 17 Pro (402×874pt logical,
1206×2622 @3x), app running through Expo Go against Metro on 8081.

| | |
|---|---|
| Routes rendered natively | 8 |
| Languages | English and Spanish |
| Native renders | **16**, all frames unique (no stuck navigations) |
| Navigation method | deep links (`exp://…/--/route`) — no taps required |

Routes: `/`, `/sign-in`, `/legal`, and the privacy, terms, AI disclosure, account deletion and
contact documents.

### What native rendering confirmed that web could not

- **Dynamic Island clearance** — content begins below it on every screen; no occlusion.
- **Native text metrics** — the Poppins display face renders correctly; the longest Spanish strings
  ("Iniciar sesión de forma segura", "Lo resolvemos hoy para que usted avance mañana.") fit on one
  line with no clipping or truncation.
- **Safe areas** — top and bottom insets respected; no content under the home indicator.
- **The touch-target fixes hold natively.** The padded "Legal & Privacy" / "Aviso Legal y Privacidad"
  link renders with its full box on device.
- **Device-locale detection works on real iOS.** With the simulator set to `es-US` and no saved
  preference, the app started in Spanish — the precedence rule verified on the platform it ships on.
- **The Spanish legal notice renders correctly**: Spanish chrome (`Versión` / `Vigente desde`), an
  English document body, and the notice explaining why, exactly as designed.

No new defects were found in the native pass. The visual identity is intact on device.

## Remaining blockers

1. **The authenticated session is gone, so no signed-in screen was rendered.** The simulator now
   shows the signed-out Welcome screen; two frames a minute apart confirmed it is stable, not
   mid-restore. Dashboard, Documents, Upload, Credit Score, Goals, Subscription, Chat, Case Command
   Center, Disputes, dispute signature and Settings therefore remain **unverified natively**, and the
   completed-state Documents checks (0% progress panel, Live Intel panel, Zoey's face / success strip
   / CTA / rerun overlap) could not be performed.

   Signing in was not attempted: no credentials were available, the account may hold real client
   data, and creating a new one is blocked by Supabase email confirmation (verified in the previous
   pass — signup returns no session and sign-in is then refused).

2. **Only one device size was drivable.** iPhone 17 Pro Max was booted and Expo Go installed, but
   loading the project needs a tap on SpringBoard's "Open in Expo Go?" confirmation. There is no
   `idb`, and AppleScript is refused (`osascript is not allowed assistive access`). No smaller than
   402pt device is installed either, so native coverage is a single width. The web pass covered 390pt
   and 430pt.

3. Legal documents remain English-only — a separate, already-tracked blocker requiring a qualified
   bilingual attorney.

### What would unblock the authenticated audit

Any one of: a signed-in session left live on the simulator; credentials for a disposable Preview
account; email confirmation disabled on the Preview Supabase project. For the second device size:
`brew install idb-companion`, or granting Terminal Accessibility permission so AppleScript can tap.
