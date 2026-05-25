import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mint: '#25F0C0',
        teal: '#2FAB8E',
        dark: '#132723',
        black: '#080808',
        surface: '#0c1f1a',
        card: '#132723',
        border: '#1e3d34',
        faint: '#0e2820',
        red: '#f87171',
        amber: '#fbbf24',
        green: '#34d399',
        blue: '#60a5fa',
        purple: '#c084fc',
        muted: '#7ab3a8',
        text: '#e8f5f1',
        white: '#ffffff',
        gray: '#D3D3D3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'mint-gradient': 'linear-gradient(135deg, #25F0C0, #2FAB8E)',
        'dark-gradient': 'linear-gradient(135deg, #132723, #0c1f1a)',
        'glow-mint': 'radial-gradient(circle at center, rgba(37,240,192,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'mint-glow': '0 0 20px rgba(37, 240, 192, 0.25)',
        'mint-glow-lg': '0 0 40px rgba(37, 240, 192, 0.35)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-mint': 'pulse-mint 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-mint': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(37, 240, 192, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(37, 240, 192, 0.5)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
