/**
 * Raw token values for the places a className can't reach: React Navigation
 * options, SVG stroke/fill props, LinearGradient color arrays, StatusBar.
 * Keep in sync with tailwind.config.js -- these are the same literals.
 */
export const tokens = {
  ink950: '#0A0518',
  ink900: '#150B29',
  ink800: '#1F1140',
  ink700: '#33205C',
  ink600: '#A99BCC',
  parchment: '#F4EFFF',

  violet400: '#C99BFF',
  violet500: '#A855F7',
  violet600: '#7E22CE',

  magenta400: '#F472D0',
  magenta500: '#E838C8',
  magenta600: '#BE1E9E',

  signalDispute: '#E838C8',
  signalPending: '#F5A524',
  signalReceived: '#3DD68C',

  // Backdrop gradient. Pure black reads dead, so the page is a very dark
  // purple-black that lifts slightly toward the top.
  backdropTop: '#170C31',
  backdropBottom: '#06030E',

  // Card fill gradient -- a subtle purple lift rather than a flat panel.
  surfaceTop: '#1D1139',
  surfaceBottom: '#130A24',

  /** Translucent violet-white for header glyphs, so they blend into the backdrop. */
  iconTranslucent: 'rgba(226,214,255,0.82)',
} as const;

/** The one gradient: violet -> magenta. Used by gauges, FAB, active tab, buttons. */
export const gradient = [tokens.violet500, tokens.magenta500] as const;
