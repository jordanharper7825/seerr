#!/bin/sh
set -e

# Default to UID/GID 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "
───────────────────────────────────────────────
  _____
 / ____|
| (___   ___  ___ _ __ _ __
 \___ \ / _ \/ _ \ '__| '__|
 ____) |  __/  __/ |  | |
|_____/ \___|\___|_|  |_|

Brought to you by Seerr
───────────────────────────────────────────────
User UID:    $PUID
User GID:    $PGID
───────────────────────────────────────────────
"

# Check if node user needs to be modified
CURRENT_UID=$(id -u node)
CURRENT_GID=$(id -g node)

if [ "$PUID" != "$CURRENT_UID" ] || [ "$PGID" != "$CURRENT_GID" ]; then
    echo "Updating node user to UID:$PUID GID:$PGID..."

    # Change node user's UID and GID
    deluser node 2>/dev/null || true
    addgroup -g "$PGID" node 2>/dev/null || true
    adduser -D -H -u "$PUID" -G node -s /bin/sh node 2>/dev/null || true

    echo "User updated successfully."
fi

# Ensure config directory exists and has correct permissions
echo "Setting permissions on /app/config..."
mkdir -p /app/config/logs

# Try to set permissions, but don't fail if some files can't be changed
# (this can happen with existing files from host mounts)
chown -R node:node /app/config 2>/dev/null || true

# Ensure at minimum the directories are accessible
chown node:node /app/config 2>/dev/null || true
chmod 755 /app/config 2>/dev/null || true

# Run the application as the node user
echo "Starting Seerr..."
exec su-exec node "$@"
