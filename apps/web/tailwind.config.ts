import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        tactical: {
          950: "#f5f6f2",
          900: "#ffffff",
          800: "#e3e8eb",
          700: "#cbd5d8",
          600: "#8495a0",
          500: "#687b89",
          400: "#526475",
          300: "#3e5669",
          200: "#29465d",
          100: "#18334a",
          50: "#edf1f2",
        },
        accent: {
          primary: "#285ea8",
          warning: "#a86d0a",
          danger: "#b83d3d",
          success: "#39765b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
