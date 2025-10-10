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
    } 
  },
  plugins: [],
};
