/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: '#090D16',
        obsidianSurface: '#0E1525',
        obsidianCard: '#121B2E',
        cyanGlow: '#38BDF8',
        indigoGlow: '#818CF8',
        emeraldGlow: '#10B981',
        amberGlow: '#F59E0B',
        roseGlow: '#F43F5E',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
