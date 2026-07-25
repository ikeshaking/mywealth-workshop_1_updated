import type { Config } from "tailwindcss";

/**
 * The MyWealth PY app themes via CSS custom properties (see globals.css) so the
 * light/dark toggle works exactly like the standalone tracker. Tailwind is used
 * for layout utilities; brand colours are exposed here as `var(--token)` refs.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", 'html[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy: "var(--navy)",
        blue: "var(--blue)",
        coral: "var(--coral)",
        lime: "var(--lime)",
        surface: "var(--surface)",
        canvas: "var(--bg)",
        ink: "var(--text)",
        "ink-dim": "var(--text-dim)",
        "ink-muted": "var(--text-muted)",
        line: "var(--border)",
      },
      fontFamily: {
        head: ["var(--hf)"],
        body: ["var(--bf)"],
      },
      maxWidth: {
        app: "1400px",
      },
    },
  },
  plugins: [],
};

export default config;
