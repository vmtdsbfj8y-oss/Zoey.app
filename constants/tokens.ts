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

  /**
   * TEXT, BY THE JOB IT DOES -- not by an opacity a caller picked.
   *
   * ==============================  WHY THESE EXIST  ==============================
   *
   * Copy used to be tinted with Tailwind opacity modifiers: `text-parchment/45`, `/55`, `/85`, and
   * once `/58`. Tailwind's opacity scale is multiples of five, so `/58` is not a real utility. It
   * generated nothing, no colour reached the `<Text>`, and React Native fell back to its own default
   * -- BLACK. The Zoey Insight paragraph shipped at a measured 1.17:1 against its own card: not dim,
   * genuinely invisible. Nothing failed loudly, because a missing colour is not an error in RN.
   *
   * So the tint is no longer arithmetic performed at the call site. These are explicit values applied
   * through `style`, where a typo is a TypeScript error rather than a silent black paragraph. The
   * contrast figures are measured off real screenshots of the surfaces each one is used on.
   *
   * ==============================  READ THE LADDER AS MEANING  ==============================
   *
   * `body` is for sentences a person actually reads and must clear comfortably. `secondary` is for
   * supporting facts -- a date, a card title -- that should read as subordinate WITHOUT being hard
   * work. `muted` is the floor for anything interactive: an unselected bureau or an inactive tab is
   * still a control someone has to be able to read before deciding to tap it, so it stays above
   * 4.5:1. `faint` is genuinely decorative and never carries a fact on its own.
   */
  textPrimary: '#F4EFFF',
  /** Body copy. ~11.7:1 on the insight card. */
  textBody: 'rgba(236,229,255,0.88)',
  /** Dates, card titles, supporting labels. ~7.6:1 on the hero. */
  textSecondary: 'rgba(228,218,255,0.72)',
  /** Unselected controls and inactive tabs. ~5.5:1 -- subdued, still clears AA. */
  textMuted: 'rgba(224,214,252,0.60)',
  /** Decoration only. Never the sole carrier of a fact. */
  textFaint: 'rgba(220,210,250,0.48)',

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
