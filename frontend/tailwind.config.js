/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        gold: {
          50: '#fdfbf7',
          100: '#f9f5ec',
          200: '#f1e6cd',
          300: '#e5d1a4',
          400: '#d7b772',
          500: '#ca9e49',
          600: '#b6843b',
          700: '#946531',
          800: '#79502c',
          900: '#644227',
        },
        slate: {
          850: '#172033',
          950: '#0b0f19',
        }
      }
    },
  },
  plugins: [],
}
