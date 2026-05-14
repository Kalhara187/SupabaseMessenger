/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./App.{js,jsx}', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e9fdf5',
          500: '#1DAA61',
          700: '#167e48',
        },
        ink: '#0B141A',
        smoke: '#F1F5F9',
      },
    },
  },
  plugins: [],
};
