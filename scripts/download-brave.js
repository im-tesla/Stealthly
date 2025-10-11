const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// Brave download URLs (portable version)
const BRAVE_URLS = {
  win64: 'https://github.com/brave/brave-browser/releases/download/v1.83.112/brave-v1.83.112-win32-x64.zip'
};

const BROWSERS_DIR = path.join(__dirname, '..', 'browsers');
const BRAVE_DIR = path.join(BROWSERS_DIR, 'brave-win64');

// Create directories if they don't exist
if (!fs.existsSync(BROWSERS_DIR)) {
  fs.mkdirSync(BROWSERS_DIR, { recursive: true });
}

if (!fs.existsSync(BRAVE_DIR)) {
  fs.mkdirSync(BRAVE_DIR, { recursive: true });
}

console.log('📥 Downloading Brave Browser for Windows x64...');

const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`   ${percent}% downloaded...`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          console.log('✅ Download complete!');
          // Small delay to ensure file is fully released
          setTimeout(() => resolve(), 500);
        });
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destination)) {
        fs.unlinkSync(destination);
      }
      reject(err);
    });
  });
};

const extractBrave = async () => {
  const zipPath = path.join(BRAVE_DIR, 'brave-portable.zip');
  
  try {
    await downloadFile(BRAVE_URLS.win64, zipPath);
    
    console.log('\n📦 Extracting Brave Browser portable...');
    console.log('   This may take a few minutes...');
    
    try {
      // Extract using PowerShell (built-in to Windows)
      const extractCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${BRAVE_DIR}' -Force"`;
      execSync(extractCommand, { stdio: 'inherit', timeout: 120000 });
      
      console.log('✅ Extraction complete!');
      
      // Check if brave.exe exists
      const braveExePath = path.join(BRAVE_DIR, 'brave.exe');
      if (fs.existsSync(braveExePath)) {
        console.log('✅ Brave Browser portable is ready!');
        console.log('\n� Location: ' + BRAVE_DIR);
        console.log('📋 Executable: ' + braveExePath);
      } else {
        console.log('⚠️  Extraction completed but brave.exe not found.');
        console.log('   Please check the directory: ' + BRAVE_DIR);
      }
      
    } catch (error) {
      console.log('⚠️  Extraction failed:', error.message);
      console.log('\n📝 You can extract manually:');
      console.log('   1. Open: ' + zipPath);
      console.log('   2. Extract all contents to: ' + BRAVE_DIR);
    }
    
    // Clean up zip file
    if (fs.existsSync(zipPath)) {
      try {
        fs.unlinkSync(zipPath);
        console.log('🧹 Cleaned up zip file');
      } catch (e) {
        console.log('⚠️  Could not delete zip file, you can delete it manually');
      }
    }
    
    console.log('\n✅ Setup complete!');
    console.log('📋 The app will use the portable Brave Browser.');
    
  } catch (error) {
    console.error('❌ Error during Brave setup:', error.message);
    console.log('\n📝 You can download Brave manually from:');
    console.log('   https://github.com/brave/brave-browser/releases');
  }
};

// Run the extraction
extractBrave().catch(console.error);
