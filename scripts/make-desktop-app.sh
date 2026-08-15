#!/bin/bash
# Builds a double-clickable macOS app that runs StudyOS locally.
#
# The bundle starts the production server if it is not already listening,
# waits for it to answer, then opens Chrome in app mode so the window has no
# browser chrome. A .app launched from Finder does not inherit a login shell,
# so every tool is referenced by absolute path.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="StudyOS"
PORT="${PORT:-3000}"
DEST="${1:-$HOME/Applications}"
APP="$DEST/$APP_NAME.app"

NODE_BIN="$(command -v node || true)"
PNPM_BIN="$(command -v pnpm || true)"
[ -n "$NODE_BIN" ] || { echo "node not found on PATH; install Node before building the app." >&2; exit 1; }
[ -n "$PNPM_BIN" ] || { echo "pnpm not found on PATH; install pnpm before building the app." >&2; exit 1; }

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>local.studyos.launcher</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>$APP_NAME</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <!-- Launcher exits once the window is open; no Dock tile should linger. -->
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/$APP_NAME" <<LAUNCHER
#!/bin/bash
set -uo pipefail
REPO="$REPO"
PORT="$PORT"
NODE_BIN="$NODE_BIN"
PNPM_BIN="$PNPM_BIN"
export PATH="\$(dirname "\$NODE_BIN"):\$(dirname "\$PNPM_BIN"):/usr/bin:/bin:/usr/sbin:/sbin"
LOG="\$HOME/Library/Logs/StudyOS.log"
mkdir -p "\$(dirname "\$LOG")"

note() { echo "[\$(date '+%F %T')] \$*" >> "\$LOG"; }
alert() { /usr/bin/osascript -e "display alert \"StudyOS\" message \"\$1\" as critical" >/dev/null 2>&1; }

is_up() { /usr/bin/curl -fsS -o /dev/null --max-time 2 "http://localhost:\$PORT/" 2>/dev/null; }

cd "\$REPO" || { alert "Project folder is missing:\n\$REPO"; exit 1; }

if ! is_up; then
  note "starting server"
  # A production build is required before 'next start'; create one if absent.
  if [ ! -d "\$REPO/.next" ]; then
    note "no build found, building"
    /usr/bin/osascript -e 'display notification "Preparing StudyOS for first launch…" with title "StudyOS"' >/dev/null 2>&1
    if ! "\$PNPM_BIN" build >> "\$LOG" 2>&1; then
      alert "The first-time build failed.\n\nSee \$LOG"
      exit 1
    fi
  fi
  # Pass the port via the environment: 'pnpm start -- --port' forwards the
  # bare '--' to next start, which then reads '--port' as a directory name.
  PORT="\$PORT" nohup "\$PNPM_BIN" start >> "\$LOG" 2>&1 &
  for _ in \$(seq 1 60); do is_up && break; sleep 1; done
fi

if ! is_up; then
  alert "StudyOS could not start on port \$PORT.\n\nSee \$LOG"
  exit 1
fi

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "\$CHROME" ]; then
  # App mode gives a standalone window with no tabs or address bar.
  "\$CHROME" --app="http://localhost:\$PORT/dashboard" \\
             --user-data-dir="\$HOME/Library/Application Support/StudyOS-Shell" \\
             >/dev/null 2>&1 &
else
  /usr/bin/open "http://localhost:\$PORT/dashboard"
fi
note "opened"
LAUNCHER
chmod +x "$APP/Contents/MacOS/$APP_NAME"

# Build the .icns from the same PNG the web manifest uses.
SRC_ICON="$REPO/public/icon-512.png"
if [ -f "$SRC_ICON" ]; then
  ICONSET="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$ICONSET"
  for s in 16 32 128 256 512; do
    /usr/bin/sips -z $s $s "$SRC_ICON" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null 2>&1
    d=$((s*2))
    /usr/bin/sips -z $d $d "$SRC_ICON" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null 2>&1
  done
  /usr/bin/iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns" 2>/dev/null || true
  rm -rf "$(dirname "$ICONSET")"
fi

/usr/bin/touch "$APP"
echo "Created $APP"
