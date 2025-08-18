import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          'bg-dark': '#000000',
          green: '#00ff00',
          'green-bright': '#00ff41',
          'green-dim': '#00cc00',
          'green-glow': '#00ff88',
          border: '#333333',
          'border-glow': '#00ff00',
          text: '#00ff00',
          'text-dim': '#00cc00',
          'text-bright': '#00ff41',
          'text-glow': '#00ff88',
          'cursor-bg': '#00ff00',
          'selection-bg': '#00ff00',
          'selection-text': '#000000',
        }
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
        'terminal': ['Courier New', 'monospace'],
        'matrix': ['Courier New', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 0.15s infinite linear',
        'type': 'type 2s steps(40) 1s 1 normal both',
        'type-reverse': 'type-reverse 2s steps(40) 1s 1 normal both',
        'cursor': 'cursor 1s infinite',
        'matrix': 'matrix 20s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        glow: {
          '0%': { 
            textShadow: '0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00',
            boxShadow: '0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00'
          },
          '100%': { 
            textShadow: '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00',
            boxShadow: '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00'
          },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%': { opacity: '0.278' },
          '5%': { opacity: '0.347' },
          '10%': { opacity: '0.236' },
          '15%': { opacity: '0.906' },
          '20%': { opacity: '0.181' },
          '25%': { opacity: '0.51' },
          '30%': { opacity: '0.745' },
          '35%': { opacity: '0.604' },
          '40%': { opacity: '0.719' },
          '45%': { opacity: '0.534' },
          '50%': { opacity: '0.972' },
          '55%': { opacity: '0.387' },
          '60%': { opacity: '0.621' },
          '65%': { opacity: '0.421' },
          '70%': { opacity: '0.602' },
          '75%': { opacity: '0.168' },
          '80%': { opacity: '0.925' },
          '85%': { opacity: '0.434' },
          '90%': { opacity: '0.82' },
          '95%': { opacity: '0.244' },
          '100%': { opacity: '0.348' },
        },
        type: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'type-reverse': {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        cursor: {
          '0%, 40%': { opacity: '1' },
          '60%, 100%': { opacity: '0' },
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'terminal-bg': 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)',
        'matrix-bg': 'linear-gradient(180deg, rgba(0,255,0,0.1) 0%, rgba(0,0,0,0) 100%)',
        'scan-line': 'linear-gradient(180deg, transparent 0%, rgba(0,255,0,0.1) 50%, transparent 100%)',
      },
      boxShadow: {
        'terminal': '0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1)',
        'terminal-glow': '0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 30px rgba(0, 255, 0, 0.2)',
        'terminal-intense': '0 0 50px rgba(0, 255, 0, 0.7), inset 0 0 50px rgba(0, 255, 0, 0.3)',
      },
      textShadow: {
        'terminal': '0 0 5px #00ff00, 0 0 10px #00ff00',
        'terminal-glow': '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00',
        'terminal-intense': '0 0 15px #00ff00, 0 0 30px #00ff00, 0 0 45px #00ff00',
      },
    },
  },
  plugins: [],
}
export default config
