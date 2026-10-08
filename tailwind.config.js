const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.ts',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      black: colors.black,
      primary: colors.stone,
      secondary: colors.yellow,
      white: colors.white,
    },
    fontFamily: {
      mono: ['NB International Pro Mono', ...defaultTheme.fontFamily.mono],
      sans: ['Lausanne', ...defaultTheme.fontFamily.sans],
      icon: ['Icons'],
    },
  },
}
