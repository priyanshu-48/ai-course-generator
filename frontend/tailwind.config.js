/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Palette sampled from the reference dashboard: deep navy canvas, slate cards, cyan + coral accents.
      colors: {
        ink: '#0b0c1c',
        panel: { DEFAULT: '#25263b', 2: '#2f3149' },
        line: '#34364f',
        fg: '#f3f4fa',
        muted: '#9496b0',
        faint: '#6b6d89',
        accent: { DEFAULT: '#4cd3dd', dim: '#2a8f98' },
        ember: { DEFAULT: '#ff8a5c', deep: '#ff6a3d' },
        violet: { DEFAULT: '#b98ae0', bg: '#3b2d52' },
        danger: '#ff6b81',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
