import type { Config } from "tailwindcss";

// Palette: vault steel with a brass accent.
//   ink   #0E1218  page background
//   steel #161B23  cards
//   plate #1D242E  raised surfaces, inputs, image wells
//   seam  #262F3B  borders
//   fog   #9AA4B2  secondary text
//   brass #F2B54A  the one accent (buttons, prices on hover, active tab)
//   mint  #3DD6A3  good news (in stock, paid, approved)
//   rust  #F0705A  bad news (sold out, rejected, delete)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E1218",
        card: "#161B23",
        raised: "#1D242E",
        border: "#262F3B",
        muted: "#9AA4B2",
        accent: "#F2B54A",
        good: "#3DD6A3",
        bad: "#F0705A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
