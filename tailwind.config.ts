import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: {
          950: "#0c0a09"
        },
        forge: {
          DEFAULT: "#b45309",
          dim: "#78350f"
        }
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
