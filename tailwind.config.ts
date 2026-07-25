import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral canvas
        canvas: {
          DEFAULT: "#faf7f2",
          soft: "#f4efe7",
        },
        // Soft lavender / muted berry accents
        lavender: {
          50: "#f6f4fb",
          100: "#ece7f7",
          200: "#d9d0ef",
          300: "#bfb0e2",
          400: "#a189d1",
          500: "#8468bd",
          600: "#6f52a6",
          700: "#5b4287",
          800: "#4a376c",
          900: "#3d2f58",
        },
        berry: {
          100: "#f7e9f0",
          200: "#efc9db",
          300: "#e0a0c0",
          400: "#cd6f9d",
          500: "#b64d80",
          600: "#973b66",
        },
        ink: {
          DEFAULT: "#2f2a3a",
          soft: "#5c5568",
          faint: "#8a8394",
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
        soft: "0 1px 2px rgba(47,42,58,0.04), 0 8px 24px rgba(47,42,58,0.06)",
        lift: "0 2px 4px rgba(47,42,58,0.05), 0 12px 32px rgba(47,42,58,0.10)",
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
