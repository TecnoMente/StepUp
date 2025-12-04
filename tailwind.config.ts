import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          900: "#08373a",
          800: "#0a3f44",
        },
        beige: {
          50: "#f5ead7",
          100: "#e8dcc5",
          200: "#dbc9a8",
        },
        gold: {
          300: "#d9b783",
        },
        ink: {
          900: "#0e0f10",
          700: "#2a2f33",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Domine", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
