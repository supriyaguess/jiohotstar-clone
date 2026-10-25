/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hotstar: {
          bg: '#0f1014',
          card: '#1a1a2e',
          purple: '#1492ff',
          blue: '#0860c4',
          gold: '#f59e0b',
          gray: '#a1a1aa',
        },
      },
      backgroundImage: {
        'hotstar-gradient': 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)',
        'hero-gradient': 'linear-gradient(to right, rgba(0,0,0,0.9) 40%, transparent 100%)',
        'card-gradient': 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '475px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

