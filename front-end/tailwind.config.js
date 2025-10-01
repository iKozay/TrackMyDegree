/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#fbd4da',
          300: '#f7aab6',
          400: '#f27a8d',
          500: '#ea546c',
          600: '#d63654',
          700: '#b42645',
          800: '#912338', // Main primary color from navbar/footer
          900: '#7d1f31',
        },
      },
    },
  },
  plugins: [],
};
