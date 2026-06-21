/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0a",
        panel: "#161310",
        gold: "#c9a227",
        "gold-soft": "#e3c77b",
        ivory: "#f4f1e7",
        "ivory-card": "#ffffff",
        "ink-soft": "#8a8270",
        "text-on-ink": "#ece6d6",
        hairline: "rgba(201,162,39,0.35)",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        body: ['"Jost"', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      maxWidth: {
        content: "1180px",
      },
      transitionTimingFunction: {
        elegant: "cubic-bezier(.22,.61,.36,1)",
      },
      letterSpacing: {
        label: "0.42em",
        nav: "0.18em",
        wordmark: "0.32em",
      },
    },
  },
  plugins: [],
};
