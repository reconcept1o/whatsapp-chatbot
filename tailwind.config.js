/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Bu iki satır ZORUNLUDUR:
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
