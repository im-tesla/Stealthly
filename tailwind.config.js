module.exports = {
  content: [
    "./src/renderer/**/*.html",
    "./src/renderer/**/*.js",
    "./src/renderer/**/*.jsx",
    "./src/renderer/index.html"
  ],
  theme: { 
    extend: {
      colors: {
        zinc: {
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }],
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '-0.011em' }],
        'lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.014em' }],
        'xl': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.017em' }],
        '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.019em' }],
        '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.021em' }],
        '4xl': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.022em' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    } 
  },
  plugins: [],
};
