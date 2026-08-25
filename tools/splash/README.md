# Splash foreground source

`assets/images/splash-icon.png` is generated from `foreground.html`, not drawn by hand and not
cropped from a mockup. Keeping the source here is the difference between an asset somebody can
adjust and a binary nobody dares touch.

Every colour in it comes from `constants/tokens.ts`, and the ring is the same three-layer
construction as `components/ui/zoey-mark.tsx` -- wide violet halo, tight lavender bloom, sharp
stroke on top -- so the splash and the Run Zoey orb stay the same object.

## Regenerating

```sh
FONT="$PWD/node_modules/@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"
sed "s|POPPINS_URL|file://$FONT|" tools/splash/foreground.html > /tmp/render.html
# then screenshot #stage at 1024x1024 with omitBackground: true
```

`omitBackground` is the part that matters: it is what yields a real alpha channel instead of a
white plate. The page itself must stay fully transparent -- a baked background rectangle would
survive into the asset and show as a square against the splash colour on any device whose
background handling differs.

After regenerating, re-run `npx expo prebuild --platform ios` and confirm the generated
`SplashScreenLogo.imageset` still reports colour type 6 with fully transparent corners.
