/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm quiet cyberpunk — warm neutrals, never pure black/white
        bg: '#FAF9F5',
        surface: '#FFFFFF',
        sidebar: '#F0EEE6',
        'surface-hover': '#E8E6DE',
        text: '#1F1E1D',
        muted: '#6B6A66',
        dim: '#9A9890',
        border: '#E5E2D9',
        // Copper accent — used sparingly (send button, focus, links)
        accent: '#C96442',
        'accent-hover': '#B55234',
        'accent-muted': '#E8D8D0',
        // Status
        ok: '#4C7C5A',
        warn: '#B5892E',
        err: '#C94F4F',
        // Legacy aliases (kept so other pages still render)
        cyan: '#00E5FF',
        yellow: '#FCEE09',
        green: '#5DFF6A',
        magenta: '#C44DFF',
        pink: '#FF3B7A',
        orange: '#FF9F43',
        'surface-1': '#FFFFFF',
        'surface-2': '#F0EEE6',
        'surface-3': '#E8E6DE',
        line: '#E5E2D9',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Source Code Pro"', 'Consolas', 'Liberation Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'body': ['16px', { lineHeight: '1.7' }],
        'tech': ['0.68rem', { letterSpacing: '0.14em', textTransform: 'uppercase' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '12px',
        lg: '16px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.06)',
        DEFAULT: '0 4px 12px rgba(0,0,0,0.08)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 150ms ease-out forwards',
        'slide-up': 'slide-up 150ms ease-out forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.7)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
