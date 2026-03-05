/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#edf2f9', // page background (logo card outer bg)
          100: '#c8eaf9', // tinted card/input backgrounds
          200: '#90d2f0', // borders, dividers
          300: '#5bbce4', // logo light highlight — badges, focus rings
          400: '#47aee0', // hover states
          500: '#2e97d4', // dominant logo blue — icons, links, active
          600: '#2481cc', // slightly deeper — secondary buttons
          700: '#1a6fbb', // logo dark base — CTA buttons, headings
          800: '#134e8a', // dark accents
          900: '#0f3460', // nav bars, strong headings
          950: '#0d2a4a', // deepest navy — dark mode text
        },
        accent: {
          100: '#dff0fb', // chart line highlight / selected row tint
          200: '#c8eaf9', // soft tint (same as primary-100, alias)
          300: '#90d2f0',
          400: '#5bbce4', // accent tags, secondary links
          500: '#2e97d4', // accent links (mirrors primary-500)
          600: '#2481cc',
          700: '#1a6fbb',
          800: '#134e8a',
          900: '#0f3460',
        },
        background: '#edf2f9', // exact logo card outer background
        surface: '#ffffff',    // cards, modals, dropdowns
        success: '#22c55e',    // price drop / positive delta
        danger:  '#ef4444',    // price rise / error states
        warning: '#f59e0b',    // near target / watch alerts
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #1a6fbb, #2e97d4)', // primary CTA buttons
        'brand-deep':      'linear-gradient(135deg, #0f3460, #2e97d4)', // headers / hero
        'brand-soft':      'linear-gradient(135deg, #2e97d4, #5bbce4)', // secondary / charts
        'surface-tint':    'linear-gradient(180deg, #edf2f9, #dff0fb)', // card hover / active
      },
    },
  },
  plugins: [],
}