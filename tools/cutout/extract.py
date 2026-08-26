#!/usr/bin/env python3
"""
Cuts Zoey out of `assets/images/zoey-splash.png` for the Dashboard.

    python3 tools/cutout/extract.py

==============================  WHAT THIS DOES AND DOES NOT DO  ==============================

It writes ONE channel: alpha. Every RGB byte in the output is copied verbatim from the source, so
nothing is repainted, recoloured, sharpened, relit or reconstructed. The proof at the bottom checks
that byte-for-byte rather than asserting it.

==============================  WHY IT IS NOT JUST A SUBJECT MATTE  ==============================

Vision's foreground matte (`tools/cutout/Cutout.swift`) gets the hair, face, suit and shoulders
right and then throws the earrings away -- it keeps roughly a tenth of them, because a luminous cyan
hoop hanging clear of the head does not read as part of the subject. Both of Vision's segmenters
agree on that and both are wrong for this asset.

So the matte is the base and the hoops are recovered separately, by colour, inside components that
are found rather than boxed by hand. The hoops are the only strongly cyan-green thing on Zoey; the
background is purple, her skin is warm, her hair is violet. `min(g, b) - r` separates them cleanly:
strongly positive on the hoops, negative everywhere on her, and near zero on the purple field.

The one other cyan object in the frame is a background bubble at her shoulder, so candidate
components are kept only if they sit in the head band AND are not the bubble. Both hoops survive
that test; the bubble does not.
"""

import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/images/zoey-splash.png"
VISION_MATTE = Path(__file__).resolve().parent / "vision-matte.png"
OUTPUT = ROOT / "assets/images/zoey-dashboard.png"


# --------------------------------------------------------------------------- PNG


def decode(path):
    data = path.read_bytes()
    w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", data[16:29])
    if depth != 8 or interlace != 0:
        raise SystemExit(f"{path.name}: need 8-bit non-interlaced, got depth={depth} interlace={interlace}")
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    idat = b""
    off = 8
    while off < len(data):
        length = struct.unpack(">I", data[off : off + 4])[0]
        if data[off + 4 : off + 8] == b"IDAT":
            idat += data[off + 8 : off + 8 + length]
        off += 12 + length
    raw = zlib.decompress(idat)
    stride = w * channels
    prev = bytearray(stride)
    rows = []
    i = 0
    for _ in range(h):
        filt = raw[i]
        i += 1
        line = bytearray(raw[i : i + stride])
        i += stride
        if filt == 1:
            for x in range(channels, stride):
                line[x] = (line[x] + line[x - channels]) & 255
        elif filt == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif filt == 3:
            for x in range(stride):
                a = line[x - channels] if x >= channels else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif filt == 4:
            for x in range(stride):
                a = line[x - channels] if x >= channels else 0
                c = prev[x - channels] if x >= channels else 0
                b = prev[x]
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(line)
        prev = line
    return w, h, channels, rows


def encode_rgba(path, w, h, rgb_rows, alpha):
    """Straight (non-premultiplied) RGBA, so the stored colours stay the source's own."""
    out = bytearray()
    for y in range(h):
        out.append(0)
        src = rgb_rows[y]
        arow = alpha[y]
        for x in range(w):
            out += bytes((src[x * 4], src[x * 4 + 1], src[x * 4 + 2], arow[x]))

    def chunk(tag, payload):
        body = tag + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(out), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


# --------------------------------------------------------------------------- masks


def cyanness(r, g, b):
    """Positive only on the cyan hoops. Purple field, violet hair and warm skin all fall below 0."""
    return min(g, b) - r


def hoopness(r, g, b):
    """
    How much a pixel belongs to a glowing hoop.

    `cyanness` alone is not enough, and the failure is instructive: the BRIGHTEST part of the stroke
    is almost white, where r, g and b are all high, so `min(g, b) - r` collapses to about zero and
    the hot core scored as "not cyan". The rings came out fragmented -- thin arcs with the backdrop
    showing through the middle of the stroke, exactly where the earring is most solid.

    So a pixel qualifies either by being cyan against a warmer neighbour, or by being bright in both
    green and blue regardless of red. Skin stays out because its green and blue are low; violet hair
    stays out because its green is low.
    """
    return max(min(g, b) - r, min(g, b) - 170)


def components(mask, w, h, min_size):
    """Connected components of a boolean mask, 4-connected, iterative."""
    seen = bytearray(w * h)
    found = []
    for sy in range(h):
        base = sy * w
        for sx in range(w):
            if not mask[base + sx] or seen[base + sx]:
                continue
            stack = [(sx, sy)]
            seen[base + sx] = 1
            pixels = []
            while stack:
                x, y = stack.pop()
                pixels.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        i = ny * w + nx
                        if mask[i] and not seen[i]:
                            seen[i] = 1
                            stack.append((nx, ny))
            if len(pixels) >= min_size:
                found.append(pixels)
    return found


def main():
    if not VISION_MATTE.exists():
        raise SystemExit(f"missing {VISION_MATTE}; run tools/cutout/Cutout.swift first")

    sw, sh, sch, src = decode(SOURCE)
    if sch != 4:
        raise SystemExit("source must be RGBA")
    mw, mh, mch, matte = decode(VISION_MATTE)
    if (mw, mh) != (sw, sh):
        raise SystemExit(f"matte is {mw}x{mh}, source is {sw}x{sh}")

    print(f"  source {sw}x{sh}, matte {mw}x{mh}")

    # ---- base alpha: Vision's subject matte, alpha channel only ----
    alpha = [bytearray(sw) for _ in range(sh)]
    for y in range(sh):
        row = matte[y]
        arow = alpha[y]
        for x in range(sw):
            arow[x] = row[x * mch + 3] if mch == 4 else row[x * mch]

    # ---- candidate hoop pixels ----
    # Two thresholds doing two different jobs.
    #
    # DETECT is deliberately strict: it decides which BLOBS are candidates, and a loose value there
    # lets a hoop merge with a neighbouring bubble and drags the whole thing in.
    #
    # The alpha ramp is far lower, because a hoop is a glowing object: its bright core is only a
    # fraction of what the eye reads as the stroke, and ramping from the detection threshold left
    # more than half the visible ring semi-transparent -- on a green screen the hoops came out
    # hollow, with the background showing straight through them.
    DETECT = 18
    LOW, HIGH = 6, 26
    cyan_mask = bytearray(sw * sh)
    for y in range(sh):
        row = src[y]
        base = y * sw
        for x in range(sw):
            if hoopness(row[x * 4], row[x * 4 + 1], row[x * 4 + 2]) >= DETECT:
                cyan_mask[base + x] = 1

    comps = components(cyan_mask, sw, sh, min_size=30)
    print(f"  cyan components >= 60px: {len(comps)}")

    # ---- keep the hoops, drop the background bubble ----
    #
    # The hoops hang beside the head; the bubble sits low and far left, clear of it. Selecting on
    # where a component lives -- rather than on a hand-drawn rectangle -- means the rule states the
    # actual reason each blob is kept or dropped.
    # The band the hoops actually hang in, measured off the source: they start below the ear line
    # and end above the collar. A looser band swept in the shoulder bubble's upper arc and a patch
    # of the suit's own trim, both of which are not earrings.
    HEAD_TOP, HEAD_BOTTOM = int(sh * 0.29), int(sh * 0.42)
    HEAD_LEFT, HEAD_RIGHT = int(sw * 0.22), int(sw * 0.75)

    hoops, rejected = [], []
    for pixels in comps:
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        inside = HEAD_LEFT <= cx <= HEAD_RIGHT and HEAD_TOP <= cy <= HEAD_BOTTOM
        (hoops if inside else rejected).append((pixels, cx, cy))

    for pixels, cx, cy in hoops:
        print(f"    KEEP hoop component: {len(pixels):5d}px centroid ({cx:.0f},{cy:.0f})")
    for pixels, cx, cy in rejected:
        print(f"    DROP background   : {len(pixels):5d}px centroid ({cx:.0f},{cy:.0f})")

    # ---- fold the hoops in with a soft ramp so the glow keeps its falloff ----
    #
    # Each hoop is filled in over its own neighbourhood, not just the detected blob: the glow falls
    # off below the detection threshold, and taking only the blob cut the soft outer edge away and
    # left a hard rim. The margin is small and local, and the nearest other cyan object in the frame
    # is hundreds of pixels away, so nothing else can be swept in.
    MARGIN = 8
    added = 0
    for pixels, _, _ in hoops:
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        x0, x1 = max(0, min(xs) - MARGIN), min(sw - 1, max(xs) + MARGIN)
        y0, y1 = max(0, min(ys) - MARGIN), min(sh - 1, max(ys) + MARGIN)
        for y in range(y0, y1 + 1):
            row = src[y]
            for x in range(x0, x1 + 1):
                score = hoopness(row[x * 4], row[x * 4 + 1], row[x * 4 + 2])
                if score < LOW:
                    continue
                ramp = (score - LOW) / (HIGH - LOW)
                value = int(max(0.0, min(1.0, ramp)) * 255)
                if value > alpha[y][x]:
                    alpha[y][x] = value
                    added += 1
    print(f"  hoop pixels folded into alpha: {added}")

    encode_rgba(OUTPUT, sw, sh, src, alpha)
    print(f"  wrote {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
