# 🌱 Habitra — “Small Habits. Big Life.”

**Habitra** is a local-first, offline-capable pixel-art productivity sanctuary, habit tracker, focus timer, and ambient music studio for **Windows 10/11 (x64)** and desktop web.

Designed to transform traditional habit tracking into a calm, living digital world, Habitra stores **100% of your data locally on your device**—with zero mandatory cloud accounts, zero subscriptions, and zero external telemetry.

- **Repository**: [https://github.com/Matheeshkumar368/Habitra_PersonalWebsite](https://github.com/Matheeshkumar368/Habitra_PersonalWebsite)

---

## ✨ Key Features

- **Living Pixel-Art Sanctuary & Classic Studio Modes**:
  - Interactive pixel-art world with floating islands, lantern-lit study spaces, dynamic weather (`Clear`, `Cloudy`, `Rain`, `Heavy Rain`, `Snow`, `Storm`), time-of-day lighting, and unlockable Progress Garden relics.
  - Visual goal progress bars on every habit card indicating completed days toward each habit's target (`X / Y days completed`).
- **Google-Docs Style Local Autosave**:
  - Every habit check, goal update, timer session, reminder change, and theme tweak saves automatically to local `IndexedDB` + redundant recovery storage (`● Saving...` → `✓ Saved locally`).
- **First-Launch Welcome & Optional Setup Wizard**:
  - Guided welcome screen with **Get Started**, **Explore Habitra**, and **Skip Setup** options covering display name, pixel environment, default music, focus timer, and optional password protection.
- **Dedicated Music Page & Local Music Folder (`public/music/`)**:
  - Bundled CC0 public-domain `.wav` tracks and WebAudio procedural synths across `Ambient`, `Focus`, `Nature`, `Rain`, and `Instrumental` categories.
  - Supports **Import Files (`+ Files`)** and **Import Folder (`+ Folder`)** for personal `.mp3`, `.wav`, `.ogg`, `.flac`, and `.m4a` tracks stored locally.
  - 4 independent volume channels (`Master / Music`, `Ambient Soundscape`, `Notifications`, `UI Sound Effects`).
- **Zero-Drift Focus Timer**:
  - Epoch-timestamp Pomodoro timer (`Focus`, `Short Break`, `Long Break`, `Custom`) that remains accurate even when minimized to the Windows system tray.
- **Salted SHA-256 Password Lock**:
  - Optional local lock screen required at the start of every new application session with dynamic user greeting, verified password change/removal, and configurable idle auto-lock.

---

## 💻 Windows System Requirements

- **Operating System**: Windows 10 (64-bit, version 1809+) or Windows 11 (64-bit)
- **Architecture**: x64 (64-bit Intel or AMD processor)
- **Memory**: 4 GB RAM minimum (~200 MB RAM used by Habitra)
- **Disk Space**: ~250 MB for the installed application + local user data in `%APPDATA%\Habitra`
- **For Building from Source**:
  - [Node.js](https://nodejs.org/) v20 LTS or v22 LTS (includes `npm`)
  - Git

---

## 🚀 Installing Habitra on Windows

When built for Windows, Habitra produces **two distinct x64 executables** in the `release/` directory (and in GitHub Actions workflow artifacts):

| Executable Filename | Type | Best For |
| :--- | :--- | :--- |
| **`Habitra-Setup-2.5.0-x64.exe`** | **NSIS Installer** | Standard laptop/PC installation. Lets you choose the install folder, creates **Desktop** and **Start Menu** shortcuts, and registers an uninstaller in Windows Settings. |
| **`Habitra-Portable-2.5.0-x64.exe`** | **Portable Executable** | Running directly from any folder or USB drive without running an installer. |

### Option A — Download Built Executables from GitHub Actions / Releases
1. Open the [GitHub Actions tab](https://github.com/Matheeshkumar368/Habitra_PersonalWebsite/actions) (or the **Releases** page) of the repository.
2. Select the latest **Build Windows Desktop App (NSIS & Portable)** workflow run.
3. Download either:
   - **`Habitra-Windows-x64-Setup-Installer`** (contains `Habitra-Setup-2.5.0-x64.exe`), or
   - **`Habitra-Windows-x64-Portable`** (contains `Habitra-Portable-2.5.0-x64.exe`).
4. Run the executable:
   - If Windows Defender SmartScreen displays *"Windows protected your PC"*, click **More info** → **Run anyway** (this appears on any unsigned indie desktop app).
5. On first launch, choose **Get Started** (5-step setup), **Explore Habitra**, or **Skip Setup**.

### Option B — Run Locally in Development Mode
```bash
git clone https://github.com/Matheeshkumar368/Habitra_PersonalWebsite.git
cd Habitra_PersonalWebsite
npm install
npm run dev
```
- To open the live development app inside an Electron desktop window:
  ```bash
  npm run desktop:dev
  ```

---

## 🛠️ Building the Windows Desktop App from Source

Habitra uses **Vite** for the frontend bundle (`dist/`) and **Electron + electron-builder** (`electron/main.cjs` and `electron/preload.cjs`) as the primary Windows desktop packaging pipeline.

### Step-by-Step Windows Build Commands

Run these commands in **PowerShell** or **Command Prompt** on Windows 10/11:

```powershell
# 1. Install all dependencies from package.json / package-lock.json
npm install

# 2. (Optional) Regenerate Windows .ico and .png icon assets
npm run icons:generate

# 3. Run TypeScript type verification
npm run lint

# 4. Build the production frontend into dist/
npm run build

# 5. Package both the Windows x64 NSIS Installer and Portable .exe into release/
npm run desktop:dist:win
```

### Generated Build Outputs (`release/` directory)

After `npm run desktop:dist:win` completes, verify these files in `release/`:

- `release/Habitra-Setup-2.5.0-x64.exe` — **NSIS Setup Installer** (multi-step installer with Desktop & Start Menu shortcuts)
- `release/Habitra-Portable-2.5.0-x64.exe` — **Standalone Portable Executable** (zero-install single `.exe`)
- `release/win-unpacked/Habitra.exe` — Unpacked desktop application bundle for rapid local testing

---

## 🤖 Automated GitHub Actions Windows Build

This repository includes `.github/workflows/windows-desktop-build.yml`, which runs on a native `windows-latest` runner whenever you push to `main` (or trigger it manually via **Actions → Build Windows Desktop App → Run workflow**):

1. Installs Node.js 22 and project dependencies via `npm`.
2. Generates Windows `.ico` / `.png` icons (`npm run icons:generate`).
3. Runs `npm run lint` and `npm run build`, verifying `dist/index.html`, `dist/icon.ico`, and `dist/music/manifest.json`.
4. Runs `npx electron-builder --win nsis portable --x64 --publish never`.
5. Uploads both `Habitra-Setup-2.5.0-x64.exe` and `Habitra-Portable-2.5.0-x64.exe` as downloadable GitHub Actions artifacts along with their SHA-256 checksums.

---

## 🔒 Data Storage, Privacy & Security

### Where Your Data Is Stored on Windows
- Both the **NSIS Installer** and **Portable** desktop builds store persistent data in:
  ```text
  %APPDATA%\Habitra
  (typically C:\Users\<YourUsername>\AppData\Roaming\Habitra)
  ```
- Because user data is stored in `%APPDATA%\Habitra` rather than the installation directory (`Program Files`), **updating, moving, or uninstalling Habitra (`"deleteAppDataOnUninstall": false`) preserves your habits, streaks, goals, music, and settings**.
- Private `.env` files, source maps, and development `node_modules` are explicitly excluded from the packaged Electron archive (`app.asar`).

### Password Protection
- Passwords are salted with a random 128-bit cryptographic salt and hashed with **SHA-256** (`salt:hash`). Plaintext passwords are never stored.
- When enabled, Habitra locks the workspace at the start of every new session and supports changing or removing your password after verifying the current password.

---

## 🔧 Troubleshooting (Windows Desktop)

| Issue | Cause & Solution |
| :--- | :--- |
| **Windows Defender SmartScreen warning on launch** | Unsigned Windows executables show an *"Unknown Publisher"* prompt on first run. Click **More info → Run anyway**. |
| **Closing the window hides Habitra instead of quitting** | By default, **Keep Running in Background (System Tray)** is enabled so focus timers and reminders continue running. Right-click the 🌱 **Habitra** icon in the Windows system tray (near the clock) and click **Quit Habitra**, or toggle off *Keep Running in Background* in **Settings**. |
| **`electron-builder` symlink privilege error on Windows** | If building locally on Windows throws `ERROR: Cannot create symbolic link : A required privilege is not held by the client`, either enable **Developer Mode** in *Windows Settings → System → For developers*, or run PowerShell as **Administrator**. |
| **Audio does not play until first click** | Click **Play** in the mini-player or dedicated **Music** page once after launch to activate the audio output stream. |
| **Resetting a forgotten password** | Because Habitra is 100% local with no cloud account, use **Settings → Backup & Restore → Export Backup (`.json`)** regularly. If you lock yourself out, deleting `%APPDATA%\Habitra` resets the local workspace. |
