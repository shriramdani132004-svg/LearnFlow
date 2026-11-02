import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#172554',
        indigo: {
          DEFAULT: '#5B5FEF',
          50: '#F0F1FF',
          100: '#E4E5FF',
          600: '#4A4EE0',
          700: '#3D40C4',
        },
        violet: '#8B5CF6',
        teal: {
          DEFAULT: '#0D9488',
          50: '#E7F8F5',
          600: '#0B7F75',
        },
        sky: {
          DEFAULT: '#0EA5E9',
          50: '#EAF7FE',
        },
        coral: {
          DEFAULT: '#F97373',
          50: '#FFF0ED',
        },
        amber: {
          DEFAULT: '#F59E0B',
          50: '#FFF8E8',
        },
        canvas: '#F5F7FF',
        lavender: '#EEF0FF',
        softteal: '#E7F8F5',
        softcoral: '#FFF0ED',
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans Variable',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 37, 84, 0.04), 0 12px 32px -18px rgba(23, 37, 84, 0.22)',
        lift: '0 18px 45px -18px rgba(91, 95, 239, 0.35)',
        focus: '0 0 0 4px rgba(91, 95, 239, 0.16)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(circle at 15% 20%, rgba(139,92,246,0.18), transparent 35%), radial-gradient(circle at 85% 10%, rgba(14,165,233,0.16), transparent 30%), radial-gradient(circle at 70% 80%, rgba(13,148,136,0.12), transparent 35%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
