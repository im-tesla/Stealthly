/**
 * Optional helper - not required. Kept for convenience.
 * Usage: node scripts/build-css.js
 * This will run the tailwind CLI if installed.
 */
const { spawn } = require('child_process');
const cmd = spawn('npx', ['tailwindcss', '-i', './src/renderer/styles/input.css', '-o', './src/build/output.css', '--minify'], { stdio: 'inherit' });

cmd.on('close', c => process.exit(c));
