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

const input = path.join(__dirname, '../icons/android-chrome-512x512.png');
const output = path.join(__dirname, '../icons');

console.log('Converting PNG to ICO...');
console.log('Input:', input);
console.log('Output:', output);

icongen(input, output, options)
  .then((results) => {
    console.log('✓ Icon created successfully!');
    console.log('Created files:', results);
  })
  .catch((err) => {
    console.error('Error creating icon:', err);
    process.exit(1);
  });
