/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // "ink" = the deep purple-black base of the HUD.
        ink: {
          950: "#0A0518", // app background
          900: "#150B29", // card surface
          800: "#1F1140", // raised surface / tab bar / Zoey card
          700: "#33205C", // borders, hairlines
          600: "#A99BCC", // muted secondary text -- 6.8:1 on ink-800, clears AA
        },
        parchment: "#F4EFFF", // primary text -- lavender-white

        // PRIMARY ACCENT. Gauges, active tab, FAB, primary buttons.
        violet: {
          400: "#C99BFF", // accent text / icons on dark
          500: "#A855F7", // the accent
          600: "#7E22CE", // pressed state, gradient anchor
        },
        // SECONDARY. Gradient partner to violet; never used alone as "the" accent.
        magenta: {
          400: "#F472D0",
          500: "#E838C8",
          600: "#BE1E9E",
        },

        // Semantic states, fixed by meaning rather than by palette.
        signal: {
          dispute: "#E838C8", // in dispute -- magenta
          pending: "#F5A524", // pending    -- amber
          received: "#3DD68C", // received  -- green
        },
      },
      // React Native resolves a single font family name -- no CSS fallback stacks,
      // and no weight synthesis for custom fonts. So each weight is its own family
      // and its own class (`font-sans-semibold`), not `font-semibold`.
      fontFamily: {
        display: ["Orbitron_700Bold"],
        sans: ["IBMPlexSans_400Regular"],
        "sans-medium": ["IBMPlexSans_500Medium"],
        "sans-semibold": ["IBMPlexSans_600SemiBold"],
        mono: ["IBMPlexMono_400Regular"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
