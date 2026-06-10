export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pastel accent colors
        'pastel-pink': '#FFB3D9',
        'pastel-peach': '#FFD9B3',
        'pastel-mint': '#B3FFD9',
        'pastel-lavender': '#D9B3FF',
        'pastel-blue': '#B3D9FF',
        // Editorial design
        'bg-light': '#FAFAF8',
        'bg-dark': '#1A1A19',
        'text-light': '#2A2A2A',
        'text-dark': '#E8E8E8',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}