import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'med': '1440px',
        'medium': '1440px',
      },
      colors: {
        syno: {
          blue: '#0086d6',
          dark: '#1e293b',
          gray: '#f8fafc',
          border: '#e2e8f0'
        }
      }
    },
  },
  plugins: [
    typography,
  ],
}

