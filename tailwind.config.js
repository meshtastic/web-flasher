/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
    "./node_modules/flowbite/**/*.{js,ts}",
    "./node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx,vue}",
  ], 
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')
  ],
}

