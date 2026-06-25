import type { Config } from 'tailwindcss';

export default {
  darkMode: 'selector',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Unity Brand Colors - Deep Dark Elegance
        'unity-black': '#1A1A1A',
        'unity-dark': '#0F0F0F',
        'unity-bg': '#000000',
        'unity-card': '#1E1E1E',
        'unity-border': '#3A3A3A',
        'unity-hover': '#2A2A2A',

        // Text Colors
        'unity-text-primary': '#FFFFFF',
        'unity-text-secondary': '#B0B0B0',
        'unity-text-tertiary': '#888888',
        'unity-text-muted': '#666666',

        // Accent Colors
        'unity-accent': '#00ADEF', // Unity Blue
        'unity-accent-hover': '#0096C1',
        'unity-success': '#4CAF50',
        'unity-warning': '#FFA500',
        'unity-error': '#FF5449',

        // Status Colors
        'unity-active': '#00D084',
        'unity-inactive': '#64748B',
      },
      backgroundColor: {
        'unity-bg-primary': '#000000',
        'unity-bg-secondary': '#0F0F0F',
        'unity-bg-tertiary': '#1A1A1A',
      },
      borderColor: {
        'unity-border': '#3A3A3A',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#FFFFFF',
            '[class~="lead"]': {
              color: '#B0B0B0',
            },
            strong: {
              color: '#FFFFFF',
            },
            'ol > li::before': {
              color: '#888888',
            },
            'ul > li::before': {
              backgroundColor: '#888888',
            },
            hr: {
              borderColor: '#3A3A3A',
            },
            blockquote: {
              color: '#B0B0B0',
              borderLeftColor: '#3A3A3A',
            },
            h1: {
              color: '#FFFFFF',
            },
            h2: {
              color: '#FFFFFF',
            },
            h3: {
              color: '#FFFFFF',
            },
            h4: {
              color: '#FFFFFF',
            },
            'figure figcaption': {
              color: '#888888',
            },
            code: {
              color: '#00ADEF',
            },
            'a code': {
              color: '#00ADEF',
            },
            pre: {
              color: '#F1F5F9',
              backgroundColor: '#1A1A1A',
            },
            thead: {
              color: '#FFFFFF',
              borderBottomColor: '#3A3A3A',
            },
            tbody: {
              borderBottomColor: '#3A3A3A',
            },
          },
        },
      },
    },
  },
  plugins: [],
} as Config;
