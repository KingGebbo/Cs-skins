/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cs-dark': '#0d1117',
        'cs-surface': '#161b22',
        'cs-border': '#30363d',
        'cs-text': '#e6edf3',
        'cs-muted': '#8b949e',
        'cs-accent': '#f78166',
        'pump-low': '#3fb950',
        'pump-mid': '#d29922',
        'pump-high': '#f85149',
      },
    },
  },
  plugins: [],
};
