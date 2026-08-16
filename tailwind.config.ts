import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0a0b0d',
          900: '#0f1113',
          850: '#141719',
          800: '#1a1d20',
          700: '#25282c',
          600: '#343840',
          500: '#5a6069',
          400: '#828993',
          300: '#a9b0b9',
          200: '#d0d5da',
          100: '#eceef1',
        },
        accent: {
          DEFAULT: '#4ade9f',
          dim: '#37c98a',
          soft: 'rgba(74, 222, 159, 0.10)',
        },
        warn: '#f5a524',
        danger: '#f76b6b',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Inter',
          'Roboto',
          'sans-serif',
        ],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'ui-serif', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
