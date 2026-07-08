/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0b0f19',
          900: '#0f1420',
          800: '#141a29',
          700: '#1c2333',
          600: '#28304a',
          500: '#3a4568',
        },
        accent: {
          400: '#7c9cff',
          500: '#5b7cfa',
          600: '#4361ee',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
