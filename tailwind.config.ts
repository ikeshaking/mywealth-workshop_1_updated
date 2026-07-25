import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral canvas — soft, calm, a little sunlit.
        canvas: {
          DEFAULT: "#f7f5f0",
          soft: "#efece4",
        },
        // Primary accent: eucalyptus / sage green. Calm, natural, Australian.
        eucalypt: {
          50: "#eef4f0",
          100: "#dcebe2",
          200: "#bcd7c7",
          300: "#93bda4",
          400: "#6aa082",
          500: "#4b8366",
          600: "#3a6b52",
          700: "#305644",
          800: "#284638",
          900: "#22392f",
        },
        // Secondary / warm alert accent: terracotta clay.
        clay: {
          100: "#f6e7df",
          200: "#eccab8",
          300: "#dda588",
          400: "#cd7f5b",
          500: "#bd6440",
          600: "#9c4f31",
        },
        ink: {
          DEFAULT: "#2b2f2c",
          soft: "#585d58",
          faint: "#868b86",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(43,47,44,0.04), 0 8px 24px rgba(43,47,44,0.06)",
        lift: "0 2px 4px rgba(43,47,44,0.05), 0 12px 32px rgba(43,47,44,0.10)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
