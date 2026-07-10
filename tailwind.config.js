/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0D1117',
          900: '#161B22',
          800: '#1C2128',
          700: '#262C36',
          600: '#30363D',
          500: '#42474F',
        },
        accent: {
          blue: '#2F81F7',
          green: '#3FB950',
          orange: '#D29922',
          red: '#F85149',
          purple: '#A371F7',
          cyan: '#79C0FF',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 16px 32px rgba(0,0,0,0.24)',
        soft: '0 8px 24px rgba(0,0,0,0.22)',
      },
    },
  },
  plugins: [],
};
