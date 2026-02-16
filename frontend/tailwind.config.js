/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#818CF8',
        cta: '#22C55E',
        bg: '#EEF2FF',
        text: '#312E81',
        white: '#FFFFFF',
        error: '#EF4444',
        phonetic: '#374151',
      },
      fontFamily: {
        heading: ['Archivo', 'Microsoft YaHei', 'PingFang SC', 'sans-serif'],
        body: ['Space Grotesk', 'Microsoft YaHei', 'PingFang SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}