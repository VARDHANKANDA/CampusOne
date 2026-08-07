import type { Config } from "tailwindcss";

// Token values mirror docs/UI_UX.md §3.1 — the full and only palette.
// Every color used anywhere in the product maps to one of these tokens.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ink-navy": "#1B2A4A",
        brass: "#B8863E",
        "brass-light": "#D9B876",
        "quad-green": "#3F6B4F",
        brick: "#A8412C",
        chalk: "#F6F4EF",
        slate: "#64748B",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        plaque: "6px",
      },
      boxShadow: {
        "level-1": "0 1px 2px rgba(27,42,74,0.08), 0 1px 1px rgba(27,42,74,0.04)",
        "level-2": "0 4px 12px rgba(27,42,74,0.14)",
        "level-3": "0 12px 32px rgba(27,42,74,0.24)",
        "level-4": "inset 0 1px 3px rgba(27,42,74,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
