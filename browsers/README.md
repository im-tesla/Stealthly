# Browsers Directory

This directory contains portable browser binaries bundled with the Stealthy app.

## Brave Browser Portable

The Brave browser portable version is automatically downloaded during `npm install` via the `postinstall` script.

- **Source**: https://github.com/brave/brave-browser/releases
- **Version**: 1.83.112
- **Location**: `brave-win64/`

### Manual Download

If automatic download fails, you can manually download and extract:

1. Download: https://github.com/brave/brave-browser/releases/download/v1.83.112/brave-v1.83.112-win32-x64.zip
2. Extract to: `browsers/brave-win64/`
3. Ensure `brave.exe` is at: `browsers/brave-win64/brave.exe`

### Distribution

When building the app (`npm run dist`), this directory is included in `extraResources` and bundled with the final installer. Users don't need to install Brave separately.

## Path Detection

The app checks for Brave in this order:

1. **Bundled portable** (Development: `browsers/brave-win64/brave.exe`)
2. **Bundled portable** (Production: `resources/browsers/brave-win64/brave.exe`)
3. **User AppData**: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe`
4. **Program Files**: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`
5. **Program Files (x86)**: `C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe`
