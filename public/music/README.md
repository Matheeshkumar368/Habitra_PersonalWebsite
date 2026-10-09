# Habitra Local Music Library (`public/music/`)

Habitra includes a self-contained, offline-first music library organized into five category folders:

```text
public/
  music/
    manifest.json
    README.md
    ambient/
      cozy-hearth-drone.wav
      starlight-drift-pad.wav
    focus/
      midnight-study-chords.wav
      deep-work-pulse.wav
    nature/
      forest-breeze-harmonic.wav
    rain/
      velvet-rain-lofi.wav
    instrumental/
      lantern-acoustic-arp.wav
      nocturne-felt-piano.wav
```

## Two Ways to Add Your Own Music

### Option 1 — Import Directly Inside Habitra (Recommended)
1. Open **Habitra** and click **Music** in the left navigation sidebar (or use the mini-player on the Dashboard).
2. Click **+ Import Music** to select multiple `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, or `.aac` files, or click **+ Import Folder** to load an entire directory of music at once.
3. Imported tracks are saved in your local **IndexedDB** database and appear under **My Music**, **Music Library**, and **Playlists**.

### Option 2 — Add Files to `public/music/` Folder & `manifest.json`
1. Place your `.mp3`, `.wav`, `.ogg`, `.flac`, or `.m4a` files inside any category folder under `public/music/` (`ambient/`, `focus/`, `nature/`, `rain/`, or `instrumental/`).
2. Add an entry to `public/music/manifest.json` under the `"tracks"` array:
   ```json
   {
     "id": "my_custom_study_song",
     "title": "My Custom Study Song",
     "artist": "Artist Name",
     "description": "Optional description",
     "category": "focus",
     "src": "./music/focus/my-custom-study-song.mp3",
     "durationSeconds": 180,
     "source": "bundled_file",
     "sceneAffinity": "study_room"
   }
   ```
3. Habitra automatically loads `public/music/manifest.json` on startup (and when clicking **Refresh Manifest** on the Music page) and adds any new tracks to the Music Library.
