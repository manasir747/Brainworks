/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#171717',
        'surface-lighter': '#262626',
        primary: '#3b82f6',
        success: '#22c55e',
        caution: '#eab308',
        warning: '#f97316',
        critical: '#ef4444',
      },
    },
  },
  plugins: [],
}
