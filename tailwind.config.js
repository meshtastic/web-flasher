/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
    './node_modules/flowbite/**/*.{js,ts}',
    './node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      colors: {
        meshtastic: {
          DEFAULT: '#67EA94',
          50: '#E8FCF0',
          100: '#D1F9E1',
          200: '#A3F3C3',
          300: '#67EA94',
          400: '#3DE07A',
          500: '#22C55E',
          600: '#1A9B4A',
          700: '#137136',
          800: '#0C4722',
          900: '#051D0E',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-up-delayed': 'fadeInUp 0.6s ease-out 0.1s both',
        'fade-in-up-delayed-2': 'fadeInUp 0.6s ease-out 0.2s both',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'bounce-in-place': 'bounceInPlace 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(103, 234, 148, 0.2), 0 0 20px rgba(103, 234, 148, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(103, 234, 148, 0.4), 0 0 40px rgba(103, 234, 148, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceInPlace: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-25%)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(103, 234, 148, 0.3)',
        'glow-lg': '0 0 40px rgba(103, 234, 148, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
}
