import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0C10",
        surface: "#0F1319",
        card: "#141922",
        border: "#222A36",
        muted: "#8B94A5",
        accent: "#4ADE80",
        accent2: "#8B7CF6",
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(74,222,128,.25), 0 10px 40px -12px rgba(74,222,128,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
