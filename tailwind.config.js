/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk design system
        bg: '#080A0F',
        'surface-1': '#0E1119',
        'surface-2': '#141925',
        'surface-3': '#1B2230',
        line: '#293244',
        text: '#F2F5F7',
        muted: '#8D98A8',
        dim: '#566173',
        cyan: '#00E5FF',
        yellow: '#FCEE09',
        green: '#5DFF6A',
        magenta: '#C44DFF',
        pink: '#FF3B7A',
        orange: '#FF9F43',
      },
      fontFamily: {
        display: ['Rajdhani', 'Bahnschrift', 'Arial Narrow', 'sans-serif'],
        technical: ['JetBrains Mono', 'Consolas', 'Cascadia Mono', 'monospace'],
        sans: ['Rajdhani', 'Bahnschrift', 'Arial Narrow', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Cascadia Mono', 'monospace'],
      },
      fontSize: {
        'tech': ['0.68rem', { letterSpacing: '0.16em', textTransform: 'uppercase' }],
      },
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '8px',
        panel: '14px',
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(0, 229, 255, 0.25)',
        'neon-yellow': '0 0 12px rgba(252, 238, 9, 0.25)',
        'neon-magenta': '0 0 12px rgba(196, 77, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
