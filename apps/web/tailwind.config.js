import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // The app was built against Tailwind's `indigo` scale (buttons, active
      // nav states, links, focus rings) — remapping the scale itself to a
      // teal brand color re-skins every one of those usages in one place
      // instead of touching each call site individually.
      colors: {
        indigo: colors.teal,
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.03)',
      },
    },
  },
  plugins: [],
};
