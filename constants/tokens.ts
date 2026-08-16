/**
 * Raw token values for the places a className can't reach: React Navigation
 * options, SVG stroke/fill props, LinearGradient color arrays, StatusBar.
 * Keep in sync with tailwind.config.js -- these are the same literals.
 */
export const tokens = {
  ink950: '#07030F',
  ink900: '#150B29',
  ink800: '#1F1140',
  ink700: '#33205C',
  ink600: '#A99BCC',
  parchment: '#F4EFFF',

  violet300: '#E4D3FF',
  violet400: '#C99BFF',
  violet500: '#A855F7',
  violet600: '#7E22CE',

  magenta400: '#F472D0',
  magenta500: '#E838C8',
  magenta600: '#BE1E9E',

  signalDispute: '#E838C8',
  signalPending: '#F5A524',
  signalReceived: '#3DD68C',

  // Backdrop: almost-black purple, not purple. The lift through the middle is
  // deliberately tiny -- the page has to read as near-black space or the glass
  // surfaces have nothing to be transparent *against*, and the whole screen
  // flattens into one purple wash.
  backdropTop: '#0B0615',
  backdropMid: '#0E0720',
  backdropBottom: '#07030F',

  // Card fill gradient -- a subtle purple lift rather than a flat panel.
  surfaceTop: '#1D1139',
  surfaceBottom: '#130A24',

  /**
   * Glass base. Deliberately low alpha: the surfaces are meant to read as
   * see-through panels lifted a shade off the black page, not as solid cards.
   * At higher alpha they turned into opaque slabs and the whole screen fogged
   * over. What defines a card's shape here is its border, not its fill.
   */
  glassBase: 'rgba(44,24,84,0.30)',

  /** Translucent violet-white for header glyphs, so they blend into the backdrop. */
  iconTranslucent: 'rgba(226,214,255,0.82)',

  /** Wordmark tint -- lavender-white rather than flat parchment. */
  wordmark: '#F0DEFF',
} as const;

/** The one gradient: violet -> magenta. Used by the FAB and primary buttons. */
export const gradient = [tokens.violet500, tokens.magenta500] as const;

/**
 * Gauge/arc sweep: mid violet into near-white lavender. Deliberately NOT the
 * magenta gradient -- the arcs in the reference are a single-hue violet ramp,
 * and magenta is what made them read as hot pink.
 */
export const arcGradient = [tokens.violet500, tokens.violet300] as const;
