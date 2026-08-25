import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { tokens } from '../../constants/tokens';

const ROOT = join(__dirname, '..', '..');

/**
 * The defect this file exists to prevent.
 *
 * ==============================  WHAT SHIPPED  ==============================
 *
 * The Zoey Insight paragraph was tinted `text-parchment/58`. Tailwind's opacity scale is multiples
 * of five, so `/58` is not a utility -- it generated no rule, no colour reached the `<Text>`, and
 * React Native applied its own default, which is BLACK. Measured against its own card the paragraph
 * came out at 1.17:1. Not dim: invisible.
 *
 * Every layer stayed quiet. Tailwind does not error on a class it cannot match, NativeWind passes
 * the miss through, TypeScript never sees a className, and RN treats "no colour" as a legal style.
 * The only place it was visible was a screenshot, which is exactly where it was eventually caught.
 *
 * ==============================  WHY A TEST AND NOT A FIXED VALUE  ==============================
 *
 * Correcting the one class would have fixed one paragraph and left the trap armed. Two checks below
 * cover the class of bug instead: no invalid opacity step anywhere in consumer code, and a real
 * contrast floor on the semantic tokens that replaced those modifiers.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git', '.expo', '__tests__', '.next', 'dist'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number) => {
    const v = raw / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** Flattens `rgba(r,g,b,a)` onto an opaque backdrop, which is what the screen actually shows. */
function flatten(token: string, bg: [number, number, number]): [number, number, number] {
  const rgba = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(token);
  if (rgba) {
    const [r, g, b] = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
    const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return [
      Math.round(a * r + (1 - a) * bg[0]),
      Math.round(a * g + (1 - a) * bg[1]),
      Math.round(a * b + (1 - a) * bg[2]),
    ];
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(token.trim());
  if (!hex) throw new Error(`unparseable colour: ${token}`);
  const n = parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe('no text colour can silently fall back to black', () => {
  const sources = () => [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components'))];

  function invalidSteps(kind: string): string[] {
    const found: string[] = [];
    const pattern = new RegExp(`\\b${kind}-[a-z]+(?:-\\d+)?/(\\d+)\\b`, 'g');
    for (const file of sources()) {
      for (const m of readFileSync(file, 'utf8').matchAll(pattern)) {
        const step = Number(m[1]);
        if (step % 5 !== 0 || step > 100) found.push(`${file.replace(ROOT, '')}: ${m[0]}`);
      }
    }
    return found;
  }

  /**
   * Tailwind ships opacity in steps of five. Anything else is a class that never existed, and in
   * React Native an unmatched text colour is not a warning -- it is black text on a black app.
   */
  it('tints no text with an opacity modifier outside Tailwind own scale', () => {
    expect(invalidSteps('text')).toEqual([]);
  });

  /**
   * Borders had the same trap on ten classes in the results components, and the guess about what
   * that looked like was WRONG in an instructive way.
   *
   * The reasoning was: an unmatched border resolves to black, the page is near-black, so the border
   * is invisible -- cosmetic at worst. Screenshots said otherwise. Those borders sit on GlassSurface
   * cards with a violet-lifted fill, not on the page, so black hairlines rendered as dark CRACKS
   * across the cards, and the two outlined REFRESH buttons read as holes punched through them. The
   * defect was more visible than the intended design, not less.
   *
   * That is why this is now a flat rule for every utility kind rather than a text-only one: a
   * "harmless" fallback is only harmless against a background nobody actually checked.
   */
  it('tints no border with an opacity modifier outside Tailwind own scale', () => {
    expect(invalidSteps('border')).toEqual([]);
  });

  it('leaves no invalid step on any colour utility at all', () => {
    for (const kind of ['text', 'bg', 'border', 'from', 'to', 'via']) {
      expect(invalidSteps(kind), kind).toEqual([]);
    }
  });

  /**
   * The tint for the paragraph that shipped black is no longer arithmetic at the call site. If
   * someone reaches for a modifier again on that specific text, this fails.
   */
  it('keeps the Zoey Insight body on a semantic token rather than an opacity modifier', () => {
    const src = readFileSync(join(ROOT, 'components', 'credit', 'credit-modules.tsx'), 'utf8');
    /* `{shownDetail}` since the insight copy became locale-resolved; `{detail}` before that. */
    const body = /\{shownDetail\}|\{detail\}/.exec(src);
    expect(body, 'insight body element not found').not.toBeNull();
    const line = src.slice(Math.max(0, (body?.index ?? 0) - 240), body?.index ?? 0);
    expect(line).toContain('tokens.textBody');
    expect(line).not.toMatch(/text-parchment\/\d+/);
  });
});

describe('the semantic text ladder actually clears its contrast floors', () => {
  /* The two surfaces this copy is read on, sampled from real screenshots. */
  const INSIGHT_CARD: [number, number, number] = [27, 13, 48];
  const HERO_CARD: [number, number, number] = [19, 13, 29];
  const SELECTOR_CELL: [number, number, number] = [16, 8, 32];

  it('body copy is comfortably readable, not merely passing', () => {
    for (const bg of [INSIGHT_CARD, HERO_CARD]) {
      expect(contrast(flatten(tokens.textBody, bg), bg)).toBeGreaterThanOrEqual(7);
    }
  });

  it('secondary copy stays readable while reading as subordinate', () => {
    for (const bg of [INSIGHT_CARD, HERO_CARD]) {
      const ratio = contrast(flatten(tokens.textSecondary, bg), bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      /* If it ever matched body copy it would stop signalling "supporting detail". */
      expect(ratio).toBeLessThan(contrast(flatten(tokens.textBody, bg), bg));
    }
  });

  /**
   * The floor that matters most. An unselected bureau and an inactive tab are still controls a
   * person has to read before deciding to tap, so "subdued" may not mean "below AA".
   */
  it('muted is still legible, because muted controls are still controls', () => {
    expect(contrast(flatten(tokens.textMuted, SELECTOR_CELL), SELECTOR_CELL)).toBeGreaterThanOrEqual(4.5);
  });

  it('orders the ladder so each step is quieter than the one above it', () => {
    const bg = INSIGHT_CARD;
    const ladder = [tokens.textPrimary, tokens.textBody, tokens.textSecondary, tokens.textMuted, tokens.textFaint];
    const ratios = ladder.map((c) => contrast(flatten(c, bg), bg));
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a));
  });
});
