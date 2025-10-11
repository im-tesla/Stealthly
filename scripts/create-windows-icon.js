const icongen = require('icon-gen');
const path = require('path');

const options = {
  type: 'png',
  modes: ['ico'],
  names: {
    ico: 'icon'
  },
  report: true
};

const input = path.join(__dirname, '..', 'icons', 'android-chrome-512x512.png');
const output = path.join(__dirname, '..', 'icons');

console.log('🎨 Generating optimized Windows ICO file...');
console.log(`   Input: ${input}`);
console.log(`   Output: ${output}`);

icongen(input, output, options)
  .then((results) => {
    console.log('✅ Icon generated successfully!');
    console.log(`   Created: ${results.length} file(s)`);
    results.forEach(result => {
      console.log(`   - ${path.basename(result)}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error generating icon:', err);
    process.exit(1);
  });
