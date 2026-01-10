#!/bin/bash
# Claude Notifier - Installation Script
# Installs hooks to Claude Code and creates config directory

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SCRIPTS_DIR="$HOME/.claude/scripts/claude-notifier"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CONFIG_DIR="$HOME/.claude-notifier"

echo "Installing Claude Notifier hooks..."
echo ""

# Check for required dependencies
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    exit 1
fi

# 1. Create directories
echo "Creating directories..."
mkdir -p "$CLAUDE_SCRIPTS_DIR"
mkdir -p "$CONFIG_DIR/sessions"

# 2. Copy hook script
echo "Installing hook script..."
cp "$SCRIPT_DIR/notify.sh" "$CLAUDE_SCRIPTS_DIR/"
chmod +x "$CLAUDE_SCRIPTS_DIR/notify.sh"

# 3. Create config template if it doesn't exist
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    cat > "$CONFIG_DIR/config.json" << 'EOF'
{
  "ably_api_key": "YOUR_ABLY_API_KEY_HERE",
  "expo_push_token": "YOUR_EXPO_PUSH_TOKEN_HERE"
}
EOF
    echo "Created config template at $CONFIG_DIR/config.json"
fi

# 4. Update Claude settings.json (merge hooks)
echo "Updating Claude Code settings..."

if [ -f "$CLAUDE_SETTINGS" ]; then
    # Backup existing settings
    BACKUP_FILE="$CLAUDE_SETTINGS.backup.$(date +%s)"
    cp "$CLAUDE_SETTINGS" "$BACKUP_FILE"
    echo "Backed up existing settings to $BACKUP_FILE"
fi

# Build hooks JSON with the correct path
HOOK_COMMAND="$CLAUDE_SCRIPTS_DIR/notify.sh"

# Create a temporary file with the new hooks configuration
HOOKS_JSON=$(cat << EOF
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "$HOOK_COMMAND"}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "$HOOK_COMMAND"}]}],
    "PostToolUse": [{"matcher": "*", "hooks": [{"type": "command", "command": "$HOOK_COMMAND"}]}],
    "Notification": [{"matcher": "permission_prompt|elicitation_dialog", "hooks": [{"type": "command", "command": "$HOOK_COMMAND"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "$HOOK_COMMAND"}]}]
  }
}
EOF
)

mkdir -p "$(dirname "$CLAUDE_SETTINGS")"

if [ -f "$CLAUDE_SETTINGS" ]; then
    # Merge hooks into existing settings, appending to existing hook arrays
    jq --argjson new "$HOOKS_JSON" '
        # For each hook type in the new config, append to existing array or create new
        .hooks = (
            (.hooks // {}) as $existing |
            ($new.hooks) as $newHooks |
            $existing | to_entries | map({
                key: .key,
                value: (
                    if $newHooks[.key] then
                        .value + $newHooks[.key]
                    else
                        .value
                    end
                )
            }) | from_entries |
            # Add any new hook types that did not exist
            . + ($newHooks | to_entries | map(select(.key as $k | $existing[$k] == null)) | from_entries)
        )
    ' "$CLAUDE_SETTINGS" > "$CLAUDE_SETTINGS.tmp"
    mv "$CLAUDE_SETTINGS.tmp" "$CLAUDE_SETTINGS"
else
    echo "$HOOKS_JSON" > "$CLAUDE_SETTINGS"
fi

echo ""
echo "============================================"
echo "  Installation complete!"
echo "============================================"
echo ""
echo "Scripts installed to: $CLAUDE_SCRIPTS_DIR"
echo "Config location: $CONFIG_DIR/config.json"
echo ""
echo "Next steps:"
echo ""
echo "  1. Get your Ably API key:"
echo "     - Go to https://ably.com and create a free account"
echo "     - Create a new app"
echo "     - Copy the API key from the app dashboard"
echo ""
echo "  2. Update your config:"
echo "     nano $CONFIG_DIR/config.json"
echo "     - Add your Ably API key"
echo ""
echo "  3. Set up the mobile app:"
echo "     cd $(dirname "$SCRIPT_DIR")/app"
echo "     npm install"
echo ""
echo "  4. Enable push notifications (required for notifications):"
echo "     npx eas init"
echo "     - Log in to Expo (or create a free account)"
echo "     - This configures the app to send push notifications"
echo ""
echo "  5. Run the mobile app:"
echo "     npx expo start"
echo "     - Open in Expo Go on your iPhone"
echo "     - Enter your Ably API key"
echo "     - Copy the Expo Push Token displayed"
echo ""
echo "  6. Add the Expo Push Token to your config:"
echo "     nano $CONFIG_DIR/config.json"
echo "     - Add the expo_push_token value"
echo ""
echo "  7. Start using Claude Code! You'll receive notifications"
echo "     when Claude needs your input."
echo ""
