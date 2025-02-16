/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",   // ✅ If using `pages/`
    "./components/**/*.{js,jsx,ts,tsx}",  // ✅ If using `components/`
    "./index.js",  // ✅ If your main file is `index.js`
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

