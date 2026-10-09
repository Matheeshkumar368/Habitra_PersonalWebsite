# 🌱 Habitra — “Small Habits. Big Life.”

**Habitra** is a local-first, offline-capable pixel-art productivity room, habit tracker, focus timer, and ambient music studio for Windows and desktop web.

Designed to transform traditional spreadsheet habit tracking into a calm, customizable digital workspace, Habitra stores **100% of your data locally on your device**—with zero mandatory cloud accounts, zero subscriptions, and zero external telemetry.

---

## 📸 Screenshots & Workspace Overview

> _Add your own screenshots to `docs/screenshots/` before publishing your GitHub release._

| View | Description |
| :--- | :--- |
| **Pixel-Art Dashboard** | Interactive pixel-art room with live weather, time-of-day lighting, 7-card KPI strip, and spreadsheet-inspired habit grid |
| **Music Library & Soundscapes** | Categorized local music player (`Ambient`, `Focus`, `Nature`, `Rain`, `Custom`, `★ Saved`) + 4-channel soundscape mixer |
| **Focus Studio & Ambient Mode** | Zero-drift epoch Pomodoro timer with full-screen `F` key Ambient Mode and unlockable Progress Garden room objects |
| **System Health & Backups** | Live runtime diagnostics, versioned local snapshots, JSON backup export/import, and salted SHA-256 password lock |

---

## ✨ Key Features

- **Google-Docs Style Local Autosave**: Every habit check, goal update, timer session, reminder change, and theme tweak saves automatically to local IndexedDB + redundant recovery storage (`● Saving...` → `✓ Saved locally`).
- **First-Launch Welcome & Skippable Setup**: Guided welcome screen with **Get Started**, **Explore Habitra**, and **Skip Setup** options covering display name, pixel environment, default music, focus timer, and optional password lock.
- **Categorized Local Music Library (`public/music/`)**:
  - Auto-discovers bundled tracks via `public/music/manifest.json` across `ambient/`, `focus/`, `nature/`, and `rain/` folders.
  - Includes **Play, Pause, Next, Previous, Shuffle, Repeat (`All / One / Off`), Interactive Seek Bar, Favorites (`★`), Mute, and 4 Independent Volume Channels** (`Master`, `Music`, `Ambient Soundscape`, `Notification`).
  - Supports **Multi-File Import (`+ Files`)** and **Entire Folder Import (`+ Folder`)** for personal `.mp3`, `.wav`, `.ogg`, `.flac`, and `.m4a` tracks without uploading anything to a server.
  - Optional **Scene-Specific Music** sync when switching pixel-art scenes.
- **15 Interactive Pixel-Art Environments**: Customize weather (`Clear`, `Cloudy`, `Rain`, `Heavy Rain`, `Snow`, `Storm`), time of day, lighting warmth, particle density, and unlockable Progress Garden desk objects.
- **Zero-Drift Focus Timer**: Epoch-timestamp Pomodoro (`Focus`, `Short Break`, `Long Break`, `Custom`) that stays accurate even when minimized or suspended.
- **Hydration & Smart Reminders**: Daily water cup target (`4–16` glasses), interval/daily/weekday/custom reminders, quiet hours, and missed-reminder recovery.
- **Salted SHA-256 Password Lock**: Optional local lock screen requested on every new application launch and configurable idle timeout.

---

## 💻 System Requirements

- **Operating System**: Windows 10 (64-bit, version 1809+) or Windows 11 (64-bit)
- **Processor**: Any modern x64 CPU (Intel Core i3 / AMD Ryzen 3 or newer)
- **Memory**: 4 GB RAM minimum (250 MB free RAM for Habitra)
- **Disk Space**: ~200 MB for standalone Windows `.exe` package + local user data in `%APPDATA%\Habitra`
- **For Building from Source**:
  - [Node.js](https://nodejs.org/) v20 LTS or v22+ and `npm`
  - (Optional, for Tauri Rust builds only): Rust stable toolchain + Microsoft C++ Build Tools + WebView2 Runtime

---

## 🚀 Installation Instructions (Windows Users)

### Option A — Download Pre-Built Windows Release (Recommended)
1. Go to the **Releases** page of this GitHub repository.
2. Download either:
   - **`Habitra-2.5.0-Windows-x64.exe`** (NSIS Installer with Desktop & Start Menu shortcuts, or Portable `.exe`).
3. Launch Habitra. On first launch, choose **Get Started**, **Explore Habitra**, or **Skip Setup**.

### Option B — Run Locally from Source
```bash
git clone <your-github-repo-url>
cd habitra
npm install
npm run dev
```
Open `http://localhost:3000` in Chrome, Edge, or Brave (you can also click **📲 Install App** in the top bar to install Habitra as a standalone Desktop PWA).

---

## 🛠️ Building the Windows `.exe` Executable

Habitra includes a complete **Electron (`electron/main.cjs` + `electron/preload.cjs`)** configuration as well as a **Tauri (`src-tauri/`)** configuration.

### 1. Build Windows Installer & Portable `.exe` with Electron Builder (Recommended)
Run these commands on a **Windows 10/11 machine** (or Windows GitHub Actions runner):

```bash
# 1. Install dependencies
npm install

# 2. Install Electron & Electron Builder dev dependencies (one-time)
npm install --save-dev electron electron-builder

# 3. Verify TypeScript types and build the production bundle into dist/
npm run lint
npm run build

# 4. Package the Windows x64 NSIS Installer and Portable .exe into release/
npm run desktop:dist:win
```

**Output Artifacts (`release/` directory):**
- `release/Habitra-2.5.0-Windows-x64.exe` (Installer & Portable executable)
- `release/win-unpacked/Habitra.exe` (Unpacked standalone application directory)

### 2. Alternative: Build Lightweight `.exe` / `.msi` with Tauri
If you have the Rust toolchain installed on Windows:
```bash
npm install --save-dev @tauri-apps/cli
npx tauri build
```
Output artifacts will be placed in `src-tauri/target/release/bundle/`.

### ⚠️ Windows SmartScreen & Code Signing Notice
Unless you sign the generated `.exe` with a paid **OV / EV Code Signing Certificate** (via `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables in `electron-builder`), Windows Defender SmartScreen will display an *"Windows protected your PC — Unknown Publisher"* prompt the first time a user downloads and runs the `.exe` from GitHub.
- Users can click **More info → Run anyway** to launch unsigned community builds.
- Never disable Windows security protections; if distributing widely, configure Authenticode signing in CI.

---

## 🎵 Music Folder (`public/music/`) & Redistributable Audio Licensing

Habitra uses a structured local music directory inside `public/music/`:

```text
public/
  music/
    manifest.json
    README.md
    ambient/
      cozy-hearth-drone.wav
    focus/
      midnight-study-chords.wav
    nature/
      forest-breeze-harmonic.wav
    rain/
      velvet-rain-lofi.wav
```

### Bundled Audio Licensing (CC0-1.0 Public Domain)
All four `.wav` files included in `public/music/` (`cozy-hearth-drone.wav`, `midnight-study-chords.wav`, `forest-breeze-harmonic.wav`, and `velvet-rain-lofi.wav`) are **100% original mathematically synthesized waveforms** created specifically for Habitra and dedicated to the public domain (**CC0-1.0**). They are completely legal to redistribute in public GitHub repositories and binary releases.

### Adding Bundled Music to `public/music/`
1. Copy redistributable `.mp3`, `.wav`, `.ogg`, `.flac`, or `.m4a` files into `public/music/ambient/`, `focus/`, `nature/`, or `rain/`.
2. Add an entry to the `"tracks"` array in `public/music/manifest.json` using a **relative path** (`./music/<category>/<file>`):
   ```json
   {
     "id": "custom_rain_study",
     "title": "Gentle Rain Piano",
     "artist": "Your Artist Name",
     "category": "rain",
     "src": "./music/rain/gentle-rain-piano.mp3",
     "source": "bundled_file",
     "license": "CC0 / CC-BY"
   }
   ```
3. Run `npm run build` so Vite copies the updated `public/music/` folder into `dist/music/`.

---

## 📂 Importing Personal Music Inside the App

Users never need to add songs one by one or edit `manifest.json` for personal listening:
1. Locate the **Music Library** panel in the right workspace column (or open **My Space → Audio**).
2. Click **`+ Files`** to select multiple audio files at once, or click **`+ Folder`** to select an entire directory of music from your computer.
3. Imported tracks appear under the **`📁 Local`** category tab and can be starred (`★`) into your **Favorites** playlist.
4. Personal music files are never uploaded to any server and are excluded from Git by `.gitignore`.

---

## 🔒 Data Storage, Privacy & Security Model

### Where Your Data Lives
- **Windows Desktop Build (`.exe`)**: Stored persistently in `%APPDATA%\Habitra` (`C:\Users\<Username>\AppData\Roaming\Habitra`), completely separate from the application installation folder (`Program Files`). Updating, reinstalling, or moving the `.exe` will **not** delete your habits, goals, or settings (`"deleteAppDataOnUninstall": false`).
- **Browser / Installed PWA**: Stored persistently in your browser profile's origin-isolated `IndexedDB` (`HabitraLocalDB_v1`) with an automatic mirror snapshot in `localStorage`.

### Password Lock Security Limits
- When enabled, Habitra hashes your password using **Web Crypto SHA-256 with a unique 128-bit cryptographic salt** (`salt:hash`). Plaintext passwords are never stored in memory or on disk.
- If password protection is enabled, Habitra requests your password on **every new application launch** before rendering the dashboard, while keeping background reminders active.
- **Important Security Boundary**: An application-level lock protects the Habitra interface from casual access on a shared computer, but it is **not** full-disk encryption. Anyone with physical access to your unlocked Windows account could inspect raw browser/application files in `%APPDATA%`. For full disk encryption, enable **Windows BitLocker**.

---

## 💾 Backup & Restore Instructions

1. Open **Settings** from the left navigation sidebar.
2. Under **Backup & Restore**, click **Export Backup (`.json`)** to download a complete, timestamped JSON file of your habits, completion history, goals, reminders, journal entries, and space presets.
3. You can also click **Create Local Snapshot** to store up to 15 versioned restore points directly inside Habitra.
4. To restore on a new PC, click **Import Backup (`.json`)** and select your backup file. Habitra validates the schema and checksum before applying the restore.

---

## ⚠️ Known Limitations & Troubleshooting

| Topic | Behavior & Resolution |
| :--- | :--- |
| **Native Windows System Tray & Startup** | Requires running the packaged **Electron (`.exe`)** or **Tauri** desktop build. When running inside a standard web browser tab, Habitra provides an in-app Background Tray Mode and Service Worker notifications, and clearly labels native OS hooks in **Settings → Diagnostics**. |
| **No Audio Output on First Click** | Modern Chromium engines suspend `AudioContext` until the first user pointer/keyboard interaction. Click **Play** or click **Test Sound** in **My Space → Audio** to unlock the audio engine. |
| **Large Folder Imports** | Importing dozens of uncompressed `.wav` or `.flac` files via the browser `FileReader` stores them in IndexedDB. For very large collections (>200 MB), prefer `.mp3` / `.ogg` / `.m4a` files or place them in `public/music/` before packaging. |
| **Forgot Local Password** | Because Habitra has no cloud server or email recovery, forgetting your local password requires clicking **Forgot Password? Emergency Reset** on the lock screen, which wipes local data to unlock the app. Keep regular `.json` backups! |

---

## ✅ Pre-Release Checklist for Maintainers

- [x] `npm run lint` passes with zero TypeScript errors.
- [x] `npm run build` bundles `dist/` with relative asset paths (`./`) and copies `dist/music/manifest.json` + all 4 CC0 `.wav` files.
- [x] `.gitignore` excludes `node_modules/`, `dist/`, `release/`, `.env`, personal backups, and private `.mp3/.flac/.m4a` files.
- [ ] Run `npm run desktop:dist:win` on a Windows 10/11 machine and complete the 15-point manual Windows test checklist.
- [ ] Choose and add a `LICENSE` file (e.g., MIT, GPL-3.0, or Apache-2.0) to the repository root before publishing on GitHub.

---

## 📄 License

- **Bundled Audio Files (`public/music/**/*.wav`)**: Released under **CC0 1.0 Universal (Public Domain Dedication)**.
- **Application Source Code**: Please refer to the `LICENSE` file in this repository. *(Repository owner: add your preferred license file—such as MIT or GPL-3.0—before publishing your release.)*
