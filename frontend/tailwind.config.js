/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#e1ebf4',
          200: '#c3d8e9',
          300: '#95bedb',
          400: '#609fc9',
          500: '#3c83b4',
          600: '#2c6997',
          700: '#25547b',
          800: '#1b3b57', // Classic academic navy
          900: '#0f2438', // Deep collegiate midnight
          950: '#091624',
        },
        navy: {
          50: '#f4f6fa',
          100: '#e8edf5',
          200: '#cbd6e8',
          300: '#9fb5d5',
          400: '#6c8ebd',
          500: '#486da4',
          600: '#365588',
          700: '#2b446e',
          800: '#1e2f4c',
          900: '#121d2f',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(15, 36, 56, 0.04), 0 1px 3px rgba(15, 36, 56, 0.06)',
        'card': '0 4px 16px rgba(15, 36, 56, 0.05)',
        'dropdown': '0 10px 25px -5px rgba(15, 36, 56, 0.1), 0 8px 10px -6px rgba(15, 36, 56, 0.05)',
      },
    },
  },
  plugins: [],
}
