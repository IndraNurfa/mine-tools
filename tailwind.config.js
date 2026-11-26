/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Hover styles only where a pointer can hover, so taps never leave them stuck.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#101010',
          soft: '#1a1a1a',
        },
        hairline: {
          DEFAULT: '#3d3a39',
        },
        primary: {
          DEFAULT: '#00d992',
          soft: '#2fd6a1',
        },
        ink: {
          DEFAULT: '#f2f2f2',
          strong: '#ffffff',
        },
        body: '#d0d0d0',
        mute: '#9ca3af',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'SFMono-Regular', 'JetBrains Mono Variable', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        pill: '9999px',
      },
      boxShadow: {
        'inset-glow': '0 0 15px rgba(92, 88, 85, 0.2)',
        'modal-stack': '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(148,163,184,0.1) inset',
      }
    },
  },
  plugins: [],
}
