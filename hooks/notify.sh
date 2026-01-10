#!/bin/bash
# Claude Notifier - Hook Script
# Handles all Claude Code hook events and sends updates to Ably + Expo Push

set -e

CONFIG_DIR="$HOME/.claude-notifier"
CONFIG_FILE="$CONFIG_DIR/config.json"
SESSIONS_DIR="$CONFIG_DIR/sessions"
HEARTBEAT_INTERVAL=15

# Read hook input from stdin
INPUT=$(cat)

# Parse common fields from hook input using a single jq call
read -r SESSION_ID HOOK_EVENT TRANSCRIPT_PATH CWD < <(
    echo "$INPUT" | jq -r '[.session_id, .hook_event_name, .transcript_path, .cwd] | map(. // "") | @tsv'
)

# Exit early if no session ID
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Create session directory if needed
SESSION_DIR="$SESSIONS_DIR/$SESSION_ID"
mkdir -p "$SESSION_DIR"

# Load config
if [ ! -f "$CONFIG_FILE" ]; then
    exit 0
fi

# Read config values in a single jq call
read -r ABLY_API_KEY EXPO_PUSH_TOKEN < <(
    jq -r '[.ably_api_key, .expo_push_token] | map(. // "") | @tsv' "$CONFIG_FILE"
)

if [ -z "$ABLY_API_KEY" ] || [ "$ABLY_API_KEY" = "YOUR_ABLY_API_KEY_HERE" ]; then
    exit 0
fi

# Function to escape string for JSON
json_escape() {
    printf '%s' "$1" | jq -Rs '.'
}

# Function to send message to Ably
send_to_ably() {
    local message_name="$1"
    local message_data="$2"

    curl -s -X POST \
        -u "$ABLY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$message_name\", \"data\": $message_data}" \
        "https://rest.ably.io/channels/claude-sessions/messages" \
        > /dev/null 2>&1 &
}

# Function to send push notification via Expo
send_push_notification() {
    local title="$1"
    local body="$2"

    if [ -z "$EXPO_PUSH_TOKEN" ] || [ "$EXPO_PUSH_TOKEN" = "YOUR_EXPO_PUSH_TOKEN_HERE" ]; then
        return
    fi

    local escaped_body
    escaped_body=$(json_escape "$body")

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"to\": \"$EXPO_PUSH_TOKEN\", \"title\": \"$title\", \"body\": $escaped_body, \"data\": {\"session_id\": \"$SESSION_ID\"}}" \
        "https://exp.host/--/api/v2/push/send" \
        > /dev/null 2>&1 &
}

# Function to get or create friendly name for session
get_friendly_name() {
    local friendly_name_file="$SESSION_DIR/friendly_name"

    if [ -f "$friendly_name_file" ]; then
        cat "$friendly_name_file"
        return
    fi

    # Extract first user message from transcript for friendly name
    local friendly_name=""
    if [ -f "$TRANSCRIPT_PATH" ]; then
        friendly_name=$(grep -m1 '"role":"user"' "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -r '.message.content[0].text // empty' 2>/dev/null | \
            head -c 50 | \
            tr '\n' ' ' | \
            sed 's/[[:space:]]*$//')
    fi

    # Fallback to session ID prefix if no prompt found
    if [ -z "$friendly_name" ]; then
        friendly_name="Session ${SESSION_ID:0:8}"
    fi

    echo "$friendly_name" > "$friendly_name_file"
    echo "$friendly_name"
}

# Get current timestamp
TIMESTAMP=$(date +%s)

# Build JSON payload using jq for proper escaping
build_ably_payload() {
    jq -nc \
        --arg sid "$SESSION_ID" \
        --arg ts "$TIMESTAMP" \
        "$@"
}

# Handle different hook events
case "$HOOK_EVENT" in
    "SessionStart")
        FRIENDLY_NAME=$(get_friendly_name)
        PAYLOAD=$(build_ably_payload \
            --arg fn "$FRIENDLY_NAME" \
            --arg cwd "$CWD" \
            '{session_id: $sid, friendly_name: $fn, cwd: $cwd, timestamp: ($ts | tonumber)}')
        send_to_ably "session_start" "$PAYLOAD"
        echo "$TIMESTAMP" > "$SESSION_DIR/last_heartbeat"
        ;;

    "SessionEnd")
        REASON=$(echo "$INPUT" | jq -r '.reason // "other"')
        PAYLOAD=$(build_ably_payload \
            --arg reason "$REASON" \
            '{session_id: $sid, reason: $reason, timestamp: ($ts | tonumber)}')
        send_to_ably "session_end" "$PAYLOAD"
        rm -rf "$SESSION_DIR"
        ;;

    "PostToolUse")
        LAST_HEARTBEAT_FILE="$SESSION_DIR/last_heartbeat"
        LAST_TIME=$(cat "$LAST_HEARTBEAT_FILE" 2>/dev/null || echo 0)
        ELAPSED=$((TIMESTAMP - LAST_TIME))

        if [ "$ELAPSED" -ge "$HEARTBEAT_INTERVAL" ]; then
            PAYLOAD=$(build_ably_payload '{session_id: $sid, timestamp: ($ts | tonumber)}')
            send_to_ably "activity_ping" "$PAYLOAD"
            echo "$TIMESTAMP" > "$LAST_HEARTBEAT_FILE"
        fi
        ;;

    "Stop")
        FRIENDLY_NAME=$(get_friendly_name)
        PAYLOAD=$(build_ably_payload \
            '{session_id: $sid, status: "waiting", notification_type: "finished", timestamp: ($ts | tonumber)}')
        send_to_ably "status_update" "$PAYLOAD"
        send_push_notification "Finished" "${FRIENDLY_NAME:0:15}... is waiting for input"
        ;;

    "Notification")
        NOTIFICATION_TYPE=$(echo "$INPUT" | jq -r '.notification_type // empty')
        MESSAGE=$(echo "$INPUT" | jq -r '.message // empty')

        # Skip idle_prompt notifications
        if [ "$NOTIFICATION_TYPE" = "idle_prompt" ]; then
            exit 0
        fi

        FRIENDLY_NAME=$(get_friendly_name)
        PAYLOAD=$(build_ably_payload \
            --arg ntype "$NOTIFICATION_TYPE" \
            --arg msg "$MESSAGE" \
            '{session_id: $sid, status: "waiting", notification_type: $ntype, message: $msg, timestamp: ($ts | tonumber)}')
        send_to_ably "status_update" "$PAYLOAD"

        # Determine push notification title based on type
        case "$NOTIFICATION_TYPE" in
            "permission_prompt") PUSH_TITLE="Approval needed" ;;
            "elicitation_dialog") PUSH_TITLE="Question" ;;
            *) PUSH_TITLE="Notification" ;;
        esac

        send_push_notification "$PUSH_TITLE" "${FRIENDLY_NAME:0:15}... $MESSAGE"
        ;;
esac

exit 0
