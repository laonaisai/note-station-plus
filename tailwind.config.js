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
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            'thead th:first-child': { paddingInlineStart: '0.75rem' },
            'thead th:last-child': { paddingInlineEnd: '0.75rem' },
            'tbody td:first-child, tfoot td:first-child': { paddingInlineStart: '0.75rem' },
            'tbody td:last-child, tfoot td:last-child': { paddingInlineEnd: '0.75rem' },
          },
        },
      },
      spacing: {
        '4.5': '1.125rem',
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

