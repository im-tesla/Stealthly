# 🕵️ Stealthly

<div align="center">

**Protect your online privacy with ease.**

*A modern, undetectable browser profile manager built with Electron, React, and cutting-edge privacy technology.*

[![Electron](https://img.shields.io/badge/Electron-30.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

![Stealthly Banner](https://via.placeholder.com/1200x400/18181b/ffffff?text=Stealthly+-+Privacy+First+Browser+Management)

</div>

---

## ✨ Features

### 🎭 **Multi-Profile Management**
- Create unlimited browser profiles with isolated sessions
- Each profile maintains separate cookies, cache, and storage
- Launch profiles independently without interference
- **Maximum Privacy Protection**: Advanced fingerprint protection enabled for all profiles
- **Automatic Brave Setup**: Browser installed automatically during setup

### 🌐 **Proxy Integration**
- Support for SOCKS5, SOCKS4, HTTP, and HTTPS proxies
- Easy proxy configuration per profile
- Real-time proxy status monitoring
- Automatic proxy cascade on deletion

### 🔒 **Military-Grade Security**
- **AES-256-CBC Encryption**: All data encrypted at rest
- Secure key derivation using scrypt
- Encrypted backups with `.encrypted` extension
- Local-only storage - never leaves your device

### 🎨 **Modern Interface**
- Beautiful dark/light mode with instant switching
- Smooth animations and transitions
- Responsive design with Tailwind CSS
- Radix UI components for accessibility
- Lucide icons for crisp visuals

### 📊 **Activity Tracking**
- Real-time dashboard with profile statistics
- Activity log with timestamps
- Session monitoring
- Protection rate analytics

### 💾 **Data Management**
- Export/Import encrypted backups
- Settings persistence across sessions
- Automatic data synchronization
- Backward compatible with legacy formats

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn** package manager
- **Windows 10/11** (64-bit) - *Currently Windows-only*
- **Note**: Brave Browser portable is bundled with the app - no separate installation needed!

### Installation

```bash
# Clone the repository
git clone https://github.com/im-tesla/Stealthly.git

# Navigate to project directory
cd Stealthly

# Install dependencies (will automatically download Brave Browser portable)
npm install

# Start development server
npm run dev
```

### Manual Brave Browser Download (if needed)

```bash
# Download Brave Browser portable if automatic download failed
npm run download-brave
```

**Note**: The portable Brave browser is automatically downloaded during `npm install` and bundled with the final app. No admin rights required!

### Building for Production

```bash
# Build the complete installer with bundled Brave Browser
npm run dist

# The installer will be created in the release/ directory
# File: Stealthly-{version}-x64-Setup.exe
```

**What's included in the installer:**
- ✅ Stealthly application
- ✅ Brave Browser portable (no separate installation needed)
- ✅ All dependencies and resources
- ✅ Works offline after installation
- ✅ No admin rights required for Brave

---

## 🎯 Usage

### Creating a Profile

1. Navigate to the **Profiles** tab
2. Click **"New Profile"** button
3. Enter profile details:
   - **Name**: Unique identifier for your profile
   - **Proxy**: Select from configured proxies or "No Proxy"
4. Click **"Create Profile"**

All profiles automatically include maximum privacy protection with advanced fingerprint protection.

### Adding a Proxy

1. Go to the **Proxies** tab
2. Click **"Add Proxy"** button
3. Configure your proxy:
   - **Name**: Friendly name for identification
   - **Address**: Format as `host:port` (e.g., `192.168.1.1:8080`)
   - **Type**: Choose SOCKS5, SOCKS4, HTTP, or HTTPS
4. Click **"Add Proxy"**

### Launching a Profile

1. Navigate to the **Profiles** tab
2. Find your desired profile
3. Click the **"Launch"** button with play icon
4. Your isolated browser session will start

### Managing Settings

1. Open the **Settings** tab
2. Configure:
   - **Auto-launch on startup**
   - **Desktop notifications**
   - **Dark/Light mode**
3. Export/Import data backups from **Data Management** section

---

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Electron** | 30.0.0 | Desktop application framework |
| **React** | 19.2.0 | UI library with automatic JSX transform |
| **Radix UI** | Latest | Accessible, unstyled components |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework |
| **Webpack** | 5.102.1 | Module bundler |

### Key Libraries

- **@radix-ui/react-dialog**: Modal dialogs with animations
- **@radix-ui/react-alert-dialog**: Confirmation dialogs
- **@radix-ui/react-tabs**: Navigation system
- **@radix-ui/react-switch**: Toggle switches
- **@radix-ui/react-select**: Dropdown menus
- **lucide-react**: Beautiful icon set
- **Node.js crypto**: AES-256-CBC encryption

---

## 📁 Project Structure

```
Stealthly/
├── src/
│   ├── main/
│   │   ├── main.js              # Electron main process
│   │   ├── preload.js           # Preload script with contextBridge
│   │   ├── ipcHandlers.js       # IPC communication handlers
│   │   ├── database.js          # Encrypted database operations
│   │   └── browserManager.js   # Browser launch & profile management
│   ├── renderer/
│   │   ├── index.html           # HTML entry point
│   │   ├── index.jsx            # React entry point
│   │   ├── App.jsx              # Main app component
│   │   ├── components/
│   │   │   ├── Dashboard.jsx   # Dashboard with stats & activity
│   │   │   ├── Profiles.jsx    # Profile management
│   │   │   ├── Proxies.jsx     # Proxy configuration
│   │   │   └── Settings.jsx    # App settings & data management
│   │   └── styles/
│   │       └── input.css        # Tailwind & custom styles
│   └── build/
│       └── output.css           # Compiled CSS
├── browsers/
│   ├── brave-win64/             # Brave Browser portable (auto-downloaded)
│   │   └── brave.exe            # Brave executable
│   ├── .gitkeep                 # Ensures directory is tracked
│   └── README.md                # Browser setup documentation
├── dist/                        # Webpack build output
├── release/                     # Production builds
├── icons/                       # App icons & favicons
├── scripts/
│   ├── build-css.js            # CSS build script
│   └── download-brave.js       # Brave Browser download script
├── package.json                 # Dependencies & scripts
├── webpack.config.js            # Webpack configuration
├── tailwind.config.js           # Tailwind CSS config
└── postcss.config.js            # PostCSS configuration
```

---

## 🔐 Security Architecture

### Encryption Layer

```
┌─────────────────────────────────────┐
│   User Data (Profiles, Proxies)    │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   JSON.stringify()                  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   AES-256-CBC Encryption            │
│   • Key: scrypt-derived             │
│   • IV: Random per operation        │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Encrypted File Storage            │
│   • profiles.json                   │
│   • proxies.json                    │
│   • settings.json                   │
│   • activity.json                   │
└─────────────────────────────────────┘
```

### Key Features
- **Zero-knowledge architecture**: Encryption key never leaves your device
- **Per-operation IV**: New initialization vector for each encryption
- **Secure key derivation**: scrypt with high work factor
- **Format**: `iv:encrypted_data` for easy decryption

---

## 🎨 Design Philosophy

### Color Palette

```css
/* Dark Mode (Primary) */
--zinc-950: #09090b    /* Background */
--zinc-900: #18181b    /* Cards */
--zinc-800: #27272a    /* Borders */
--zinc-700: #3f3f46    /* Hover states */

/* Light Mode */
--white: #ffffff       /* Background */
--zinc-50: #fafafa     /* Cards */
--zinc-200: #e4e4e7    /* Borders */

/* Accents */
--blue-400: #60a5fa    /* Profiles */
--emerald-400: #34d399 /* Active status */
--red-400: #f87171     /* Danger actions */
```

### Animation Principles
- **Smooth & Subtle**: 200-300ms transitions
- **Apple-like Easing**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **No Jank**: Hardware-accelerated transforms
- **Purposeful**: Animations guide user attention

---

## 🧪 Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build production bundle
npm run build

# Build development bundle
npm run build:dev

# Watch mode for rapid development
npm run watch

# Start Electron app
npm start
```

### Hot Reload
The app uses `electron-reloader` for automatic restarts during development. Changes to:
- React components → Auto-refresh
- Main process files → Auto-restart
- CSS files → Instant update

---

## 📦 Database Schema

### Profile Object
```javascript
{
  id: 1697123456789,
  name: "Work Profile",
  proxyId: 1697123456780,
  status: "idle",              // "idle" | "active"
  createdAt: "2025-10-11T00:00:00.000Z",
  lastUsed: null
}
```

### Proxy Object
```javascript
{
  id: 1697123456780,
  name: "US Proxy 1",
  host: "192.168.1.1",
  port: "8080",
  type: "SOCKS5",              // "SOCKS5" | "SOCKS4" | "HTTP" | "HTTPS"
  status: "active"             // "active" | "inactive"
}
```

### Activity Object
```javascript
{
  id: "1697123456789",
  timestamp: "2025-10-11T00:00:00.000Z",
  type: "profile_created",     // "profile_created" | "profile_edited" | "profile_deleted"
  profileName: "Work Profile",
  details: "Profile 'Work Profile' created"
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Code Style
- Use ES6+ features
- Follow React best practices
- Maintain consistent naming conventions
- Add comments for complex logic
- Test all changes thoroughly

---

## 🐛 Known Issues

- [ ] Profile launching currently logs to console (not yet implemented)
- [ ] Proxy editing not yet implemented (delete and recreate workaround)
- [ ] Activity log limited to 100 entries (automatic trimming)

---

## 📋 Roadmap

### Version 1.1.0
- [ ] Actual browser session launching
- [ ] Browser fingerprint randomization
- [ ] WebRTC leak protection
- [ ] Cookie import/export per profile

### Version 1.2.0
- [ ] Profile templates
- [ ] Bulk operations (multi-select)
- [ ] Advanced proxy testing
- [ ] Profile groups/tags

### Version 2.0.0
- [ ] Cloud backup sync (encrypted)
- [ ] Team collaboration features
- [ ] Browser extension management
- [ ] Automation scripts per profile

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Tesla** ❤

- GitHub: [@im-tesla](https://github.com/im-tesla)
- Repository: [Stealthly](https://github.com/im-tesla/Stealthly)

---

## 🙏 Acknowledgments

- **Electron Team** - For the amazing desktop framework
- **React Team** - For the powerful UI library
- **Radix UI** - For accessible component primitives
- **Tailwind Labs** - For the utility-first CSS framework
- **Lucide Icons** - For beautiful, consistent icons

---

## 📞 Support

If you found this project helpful, please consider:
- ⭐ **Starring** the repository
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 🤝 **Contributing** to the codebase

---

<div align="center">

**Made with ❤ by Tesla**

*Privacy is not a luxury, it's a right.*

</div>
