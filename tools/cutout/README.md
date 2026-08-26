# Dashboard Zoey cutout

`assets/images/zoey-dashboard.png` is `assets/images/zoey-splash.png` with a new alpha channel and
nothing else changed. Every RGB byte is copied from the source; the extractor writes one channel.

## Why two steps

Vision's subject matte handles the hair, face, suit and shoulders well and then discards the cyan
hoops — a luminous ring hanging clear of the head does not read as part of the subject. Both
`VNGenerateForegroundInstanceMaskRequest` and `VNGeneratePersonSegmentationRequest` keep only about
a tenth of them. So the matte is the base, and the hoops are recovered by colour.

The hoops are the only strongly cyan-green thing on Zoey: `min(g, b) - r` is strongly positive on
them, negative on her skin and hair, and near zero on the purple field. The one other cyan object in
the frame is a background bubble at her shoulder, which is excluded by where it sits rather than by
a hand-drawn rectangle — so the rule states the actual reason it is dropped.

## Reproducing

```sh
swiftc -O tools/cutout/Cutout.swift -o /tmp/cutout
/tmp/cutout assets/images/zoey-splash.png tools/cutout/vision-matte.png
python3 tools/cutout/extract.py
python3 tools/cutout/verify.py
```

`vision-matte.png` is committed because Vision's output depends on the OS version; regenerating it
on a different macOS may shift the matte slightly, and the committed copy is what this asset was
built from.
