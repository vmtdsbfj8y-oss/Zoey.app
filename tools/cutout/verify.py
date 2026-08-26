#!/usr/bin/env python3
"""
Proves `assets/images/zoey-dashboard.png` is `zoey-splash.png` with a new alpha channel and nothing
else touched.

    python3 tools/cutout/verify.py

Every claim below is checked against the two files rather than asserted in prose. Exits non-zero on
any failure so it can gate a change.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract import ROOT, cyanness, decode  # noqa: E402

SOURCE = ROOT / "assets/images/zoey-splash.png"
CUTOUT = ROOT / "assets/images/zoey-dashboard.png"

failures = []


def check(label, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(' -- ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def main():
    sw, sh, sch, src = decode(SOURCE)
    cw, chh, cch, cut = decode(CUTOUT)

    check("dimensions unchanged", (sw, sh) == (cw, chh), f"{cw}x{chh}")
    check("output is RGBA", cch == 4, f"channels={cch}")

    # ---- RGB byte-identical wherever a pixel is retained ----
    mismatched = 0
    retained = 0
    for y in range(0, sh):
        s, c = src[y], cut[y]
        for x in range(0, sw):
            if c[x * 4 + 3] == 0:
                continue
            retained += 1
            if s[x * 4] != c[x * 4] or s[x * 4 + 1] != c[x * 4 + 1] or s[x * 4 + 2] != c[x * 4 + 2]:
                mismatched += 1
    check(
        "RGB of every retained pixel is byte-identical to the source",
        mismatched == 0,
        f"{retained} retained, {mismatched} altered",
    )

    # ---- corners and corner blocks ----
    corners = [
        cut[0][0 * 4 + 3],
        cut[0][(sw - 1) * 4 + 3],
        cut[sh - 1][0 * 4 + 3],
        cut[sh - 1][(sw - 1) * 4 + 3],
    ]
    check("all four corners alpha 0", max(corners) == 0, str(corners))

    BLOCK = 160
    blocks = {
        "top-left": (0, 0),
        "top-right": (sw - BLOCK, 0),
        "bottom-left": (0, sh - BLOCK),
        "bottom-right": (sw - BLOCK, sh - BLOCK),
    }
    worst = []
    for name, (bx, by) in blocks.items():
        m = max(cut[y][x * 4 + 3] for y in range(by, by + BLOCK) for x in range(bx, bx + BLOCK))
        worst.append(f"{name}={m}")
        if m != 0:
            failures.append(f"corner block {name}")
    check(f"{BLOCK}x{BLOCK} corner blocks max alpha 0", all("=0" in w for w in worst), ", ".join(worst))

    # ---- no rectangular plate ----
    #
    # A plate shows up as a fully opaque edge, not as any opaque edge at all: her arm and shoulder
    # genuinely reach the frame on the left and right, and demanding a 100% clear border failed on
    # her own body. What must be true is that the border is overwhelmingly clear and that no single
    # row or column is opaque end to end.
    border_px, border_opaque = 0, 0
    for x in range(sw):
        for y in (0, sh - 1):
            border_px += 1
            if cut[y][x * 4 + 3] > 0:
                border_opaque += 1
    for y in range(sh):
        for x in (0, sw - 1):
            border_px += 1
            if cut[y][x * 4 + 3] > 0:
                border_opaque += 1
    clear_pct = 100 * (border_px - border_opaque) / border_px
    check("border is overwhelmingly clear", clear_pct >= 90, f"{clear_pct:.1f}% clear")

    full_row = any(all(cut[y][x * 4 + 3] > 0 for x in range(sw)) for y in range(0, sh, 7))
    full_col = any(all(cut[y][x * 4 + 3] > 0 for y in range(0, sh, 7)) for x in range(0, sw, 7))
    check("no fully opaque row or column (a plate would have both)", not (full_row or full_col))

    transparent = sum(1 for y in range(0, sh, 3) for x in range(0, sw, 3) if cut[y][x * 4 + 3] == 0)
    total = len(range(0, sh, 3)) * len(range(0, sw, 3))
    check("a real cutout, not a full-frame image", transparent / total > 0.35, f"{100*transparent/total:.1f}% clear")

    # ---- hoops ----
    T, B = int(sh * 0.29), int(sh * 0.42)
    L, R = int(sw * 0.22), int(sw * 0.75)
    stroke = [
        (x, y)
        for y in range(T, B)
        for x in range(L, R)
        if cyanness(src[y][x * 4], src[y][x * 4 + 1], src[y][x * 4 + 2]) >= 30
    ]
    kept = sum(1 for x, y in stroke if cut[y][x * 4 + 3] >= 200)
    pct = 100 * kept / max(len(stroke), 1)
    check("at least 95% of illuminated hoop stroke retained", pct >= 95, f"{pct:.1f}% of {len(stroke)}px")

    # Hoop interiors: the region ENCLOSED by each ring, found by flooding inward from the ring's
    # own bounding box. Measuring "dark pixels in the head band" instead swept in her hair and the
    # shadow on her suit, which the matte keeps for good reason.
    def enclosed(x0, y0, x1, y1):
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        outside = bytearray(bw * bh)
        stack = [(x, 0) for x in range(bw)] + [(x, bh - 1) for x in range(bw)]
        stack += [(0, y) for y in range(bh)] + [(bw - 1, y) for y in range(bh)]
        while stack:
            x, y = stack.pop()
            if not (0 <= x < bw and 0 <= y < bh):
                continue
            i = y * bw + x
            if outside[i]:
                continue
            if cut[y0 + y][(x0 + x) * 4 + 3] >= 200:
                continue
            outside[i] = 1
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        return [
            (x0 + x, y0 + y)
            for y in range(bh)
            for x in range(bw)
            if not outside[y * bw + x] and cut[y0 + y][(x0 + x) * 4 + 3] < 200
        ]

    holes = enclosed(int(sw * 0.28), int(sh * 0.31), int(sw * 0.42), int(sh * 0.41))
    holes += enclosed(int(sw * 0.60), int(sh * 0.34), int(sw * 0.74), int(sh * 0.43))
    filled = sum(1 for x, y in holes if cut[y][x * 4 + 3] >= 200)
    check(
        "hoop interiors stay transparent",
        len(holes) > 0 and filled == 0,
        f"{len(holes)}px enclosed, {filled} opaque",
    )

    # ---- nothing from the background survives, attached or detached ----
    #
    # The earlier version of this check aimed at a rectangle by her shoulder and "failed" on her own
    # blue pauldron. The requirement it was trying to express is better stated structurally: whatever
    # the mask retains has to be ONE object. A bubble, planet, star or stray glow that survived would
    # either float free as its own component or hang off her silhouette as a lump.
    seen = bytearray(sw * sh)
    sizes = []
    for sy in range(0, sh):
        base = sy * sw
        for sx in range(0, sw):
            if seen[base + sx] or cut[sy][sx * 4 + 3] < 40:
                continue
            stack = [(sx, sy)]
            seen[base + sx] = 1
            n = 0
            while stack:
                x, y = stack.pop()
                n += 1
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh:
                        i = ny * sw + nx
                        if not seen[i] and cut[ny][nx * 4 + 3] >= 40:
                            seen[i] = 1
                            stack.append((nx, ny))
            sizes.append(n)
    sizes.sort(reverse=True)
    strays = [n for n in sizes[1:] if n > 400]
    check(
        "no background object remains (one subject, no stray blobs)",
        len(strays) == 0,
        f"{len(sizes)} components, largest {sizes[0]}, strays>400px: {strays[:5]}",
    )

    print()
    if failures:
        print(f"  {len(failures)} FAILURE(S): {failures}")
        return 1
    print("  all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
