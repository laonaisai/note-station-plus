import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
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
    plugin(function({ addVariant }) {
      addVariant('med', [
        ':root[data-ui-density="medium"] &',
        '&[data-ui-density="medium"]',
      ]);
      addVariant('medium', [
        ':root[data-ui-density="medium"] &',
        '&[data-ui-density="medium"]',
      ]);
    }),
  ],
}

