import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#08090b',
          900: '#0d0f12',
          850: '#121417',
          800: '#191c20',
          700: '#24282e',
          600: '#33383f',
          500: '#565d66',
          400: '#7c848d',
          300: '#a6adb5',
          200: '#ced3d8',
          100: '#e8eaed',
        },
        accent: {
          DEFAULT: '#5eead4',
          dim: '#2dd4bf',
          soft: 'rgba(94, 234, 212, 0.12)',
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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
