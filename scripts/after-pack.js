// scripts/after-pack.js
// Patches Windows executable with correct icon and version metadata after packaging

const path = require('path');
const { execFileSync } = require('child_process');

exports.default = async function afterPack(context) {
  // Only run on Windows
  if (process.platform !== 'win32') {
    console.log('afterPack: Skipping (not Windows)');
    return;
  }

  try {
    const { appOutDir, packager } = context;
    const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
    const iconPath = path.resolve(__dirname, '..', 'icons', 'icon.ico');

    // Path to rcedit executable
    const rceditPath = path.resolve(
      __dirname,
      '..',
      'node_modules',
      'rcedit',
      'bin',
      process.arch === 'x64' ? 'rcedit-x64.exe' : 'rcedit.exe'
    );

    const version = packager.appInfo.version || '0.1.0';
    const productName = packager.appInfo.productName || 'Stealthy';
    const companyName = 'Stealthy Team';
    const year = new Date().getFullYear();

    console.log(`\n✓ afterPack: Patching ${productName}.exe with icon and metadata...`);
    console.log(`  Icon: ${iconPath}`);
    console.log(`  Version: ${version}`);

    // Run rcedit to patch the executable
    execFileSync(rceditPath, [
      exePath,
      '--set-icon', iconPath,
      '--set-file-version', version,
      '--set-product-version', version,
      '--set-version-string', 'CompanyName', companyName,
      '--set-version-string', 'FileDescription', productName,
      '--set-version-string', 'ProductName', productName,
      '--set-version-string', 'InternalName', `${packager.appInfo.productFilename}.exe`,
      '--set-version-string', 'OriginalFilename', `${packager.appInfo.productFilename}.exe`,
      '--set-version-string', 'LegalCopyright', `Copyright © ${year} ${companyName}`,
      '--set-version-string', 'FileVersion', version,
      '--set-version-string', 'ProductVersion', version,
    ], { stdio: 'inherit' });

    console.log(`✓ afterPack: Successfully patched ${exePath}`);
  } catch (err) {
    console.error('✗ afterPack: Failed to patch exe:', err.message);
    throw err; // Fail the build if patching fails
  }
};
