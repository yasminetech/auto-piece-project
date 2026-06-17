/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Rajdhani"', '"Space Grotesk"', 'sans-serif'],
        body: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          red: '#ef233c',
          'red-strong': '#d90429',
          blue: '#4cc9f0',
          cyan: '#80edff',
          steel: '#cbd5e1',
          green: '#2dd4bf',
          warning: '#f59e0b',
        },
        automotive: {
          dark: '#05070d',
          panel: '#0b101a',
          surface: '#101827',
          light: '#eef3f8',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '22px',
        '4xl': '28px',
      },
      boxShadow: {
        'glow-red': '0 20px 80px rgba(239, 35, 60, 0.2)',
        'glow-blue': '0 18px 70px rgba(76, 201, 240, 0.16)',
        'glow-neon': '0 0 30px rgba(76, 201, 240, 0.3)',
        'premium': '0 24px 80px rgba(0, 0, 0, 0.42)',
        'float': '0 18px 54px rgba(2, 6, 23, 0.16)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(.2,.9,.3,1) both',
        'slide-down': 'slideDown 0.4s cubic-bezier(.2,.9,.3,1) both',
        'fade-in': 'fadeIn 0.5s cubic-bezier(.2,.9,.3,1) both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(.2,.9,.3,1) both',
        'shimmer': 'shimmer 2s linear infinite',
        'reveal': 'reveal 0.8s cubic-bezier(.2,.9,.3,1) both',
        'neon-flicker': 'neonFlicker 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(76, 201, 240, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(76, 201, 240, 0.4), 0 0 80px rgba(239, 35, 60, 0.15)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(40px) scale(0.97)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        neonFlicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
          '52%': { opacity: '1' },
          '54%': { opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
}

