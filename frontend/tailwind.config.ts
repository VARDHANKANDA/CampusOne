import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ink-navy": "var(--ink-navy)",
        brass: "var(--brass)",
        "brass-light": "var(--brass-light)",
        "quad-green": "var(--quad-green)",
        brick: "var(--brick)",
        chalk: "var(--chalk)",
        slate: "var(--slate)",
        // Semantic color shortcuts
        canvas: "var(--bg-canvas)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "card-bg": "var(--card-bg)",
        "card-border": "var(--card-border)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "Outfit", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        plaque: "12px",
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

