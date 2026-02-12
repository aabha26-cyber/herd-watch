/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: { 800: "#1a1d24", 900: "#0f1115" },
        accent: { 400: "#22c55e", 500: "#16a34a", 600: "#15803d" },
      },
    },
  },
  plugins: [],
};
