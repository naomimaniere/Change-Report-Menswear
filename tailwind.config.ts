import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mdv: {
          cream: "#F5F1EA",
          paper: "#FFFFFF",
          charcoal: "#1C1917",
          graphite: "#3A3633",
          mute: "#78716C",
          line: "#E7E2DA",
          hover: "#ECE6DC",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
