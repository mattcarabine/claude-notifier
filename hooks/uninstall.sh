#!/bin/bash
# Claude Notifier - Uninstallation Script
# Removes hooks from Claude Code settings

set -e

CLAUDE_SCRIPTS_DIR="$HOME/.claude/scripts/claude-notifier"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CONFIG_DIR="$HOME/.claude-notifier"

echo "Uninstalling Claude Notifier hooks..."
echo ""

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

# 1. Remove hooks from Claude settings
if [ -f "$CLAUDE_SETTINGS" ]; then
    echo "Removing hooks from Claude Code settings..."

    # Backup existing settings
    BACKUP_FILE="$CLAUDE_SETTINGS.backup.$(date +%s)"
    cp "$CLAUDE_SETTINGS" "$BACKUP_FILE"
    echo "Backed up existing settings to $BACKUP_FILE"

    # Remove our specific hooks (those pointing to our script)
    HOOK_COMMAND="$CLAUDE_SCRIPTS_DIR/notify.sh"

    jq --arg cmd "$HOOK_COMMAND" '
        .hooks |= (
            if . then
                with_entries(
                    # Filter out hook entries that contain our command
                    .value |= map(
                        select(
                            (.hooks // []) | map(.command) | index($cmd) | not
                        )
                    ) |
                    # Remove hook types with empty arrays
                    select(.value | length > 0)
                ) |
                # Remove hooks object if empty
                if . == {} then null else . end
            else
                .
            end
        ) |
        # Clean up null hooks
        if .hooks == null then del(.hooks) else . end
    ' "$CLAUDE_SETTINGS" > "$CLAUDE_SETTINGS.tmp"

    mv "$CLAUDE_SETTINGS.tmp" "$CLAUDE_SETTINGS"
    echo "Hooks removed from settings."
fi

# 2. Remove installed scripts
if [ -d "$CLAUDE_SCRIPTS_DIR" ]; then
    echo "Removing installed scripts..."
    rm -rf "$CLAUDE_SCRIPTS_DIR"
    echo "Scripts removed."
fi

# 3. Ask about config/data removal
echo ""
read -p "Remove config and session data at $CONFIG_DIR? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$CONFIG_DIR"
    echo "Config and data removed."
else
    echo "Config and data preserved at $CONFIG_DIR"
fi

echo ""
echo "============================================"
echo "  Uninstallation complete!"
echo "============================================"
echo ""
echo "Claude Notifier hooks have been removed."
echo "You may need to restart Claude Code for changes to take effect."
echo ""
