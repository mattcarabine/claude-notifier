# Claude Notifier - Development Guide

## Project Overview

Claude Notifier is a system that sends push notifications to your iOS device when Claude Code requires user input. It consists of:

1. **Bash hooks** that integrate with Claude Code's hook system
2. **React Native (Expo) app** that displays sessions and receives push notifications

## Architecture

```
Mac Mini (Claude Code)          Ably Pub/Sub             iOS Device
┌─────────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│ Claude Code Session │    │ Channel:           │    │ Expo Go App     │
│                     │    │ claude-sessions    │    │                 │
│ Hooks:              │    │                    │    │ - Sessions tab  │
│ - SessionStart ─────┼───►│ Messages:          │◄───┼─ - History tab  │
│ - PostToolUse ──────┼───►│ - session_start    │    │                 │
│ - Stop ─────────────┼───►│ - session_end      │    │ Stale detection │
│ - Notification ─────┼───►│ - activity_ping    │    │ (60s timeout)   │
│ - SessionEnd ───────┼───►│ - status_update    │    │                 │
└─────────────────────┘    └────────────────────┘    └─────────────────┘
         │                                                    ▲
         │                  Expo Push API                     │
         └────────────────────────────────────────────────────┘
                     (notification events only)
```

## Key Design Decisions

### No External Daemon
All heartbeat/lifecycle management is handled via Claude Code hooks. The `PostToolUse` hook with rate limiting (15s interval) serves as the activity signal. This avoids the need for a separate launchd/cron process.

### Client-Side Stale Detection
The mobile app tracks `last_seen` timestamps for each session. If no `activity_ping` is received for 60 seconds, the session is marked as stale and removed. This handles CTRL+C termination where `SessionEnd` may not fire.

### Rate-Limited Activity Pings
`PostToolUse` fires on every tool call (potentially hundreds per session). The hook script tracks the last ping timestamp and only sends if 15+ seconds have elapsed.

### Expo Go Compatibility
Uses Expo Push API directly instead of Ably's native push integration. This allows running in Expo Go without needing a development build with native Firebase SDK.

## Hook Event Flow

| Event | When Fired | Action |
|-------|------------|--------|
| `SessionStart` | Claude Code session begins | Register session, extract friendly name from transcript |
| `PostToolUse` | After any tool call | Send rate-limited activity ping (max 1 per 15s) |
| `Stop` | Claude finishes responding | Update status to "waiting", send push notification |
| `Notification` | Permission/question dialog | Update status, send push notification |
| `SessionEnd` | Session ends cleanly | Deregister session, cleanup local state |

## Ably Message Types

```typescript
// session_start - New session registered
{
  name: 'session_start',
  data: { session_id, friendly_name, cwd, timestamp }
}

// session_end - Session ended
{
  name: 'session_end',
  data: { session_id, reason, timestamp }
}

// activity_ping - Session is active (rate-limited)
{
  name: 'activity_ping',
  data: { session_id, timestamp }
}

// status_update - Status changed (triggers push)
{
  name: 'status_update',
  data: { session_id, status, notification_type?, message?, timestamp }
}
```

## App State Management

### Sessions (useSessions hook)
- Maintains a `Map<session_id, Session>` via `useRef`
- Updates state on Ably messages
- Runs stale detection every 10 seconds
- Sessions without activity for 60s are removed

### Notification History (useNotificationHistory hook)
- Stored in AsyncStorage as array (max 100 items)
- Backfills from Ably channel history (24h retention) on app launch
- Deduplicates by `session_id + timestamp`

### Ably Connection (useAbly hook)
- Auto-connects on mount if API key is stored
- Subscribes to messages when connected
- Exposes connection state for UI

## File Structure

```
claude-notifier/
├── hooks/
│   ├── notify.sh          # Main hook script
│   ├── install.sh         # Installation script
│   └── uninstall.sh       # Uninstallation script
├── app/
│   ├── app/               # Expo Router screens
│   │   ├── (tabs)/
│   │   │   ├── index.tsx  # Sessions tab
│   │   │   └── history.tsx # History tab
│   │   ├── setup.tsx      # First-launch setup
│   │   └── _layout.tsx    # Root layout
│   ├── components/
│   │   ├── SessionCard.tsx
│   │   └── NotificationItem.tsx
│   ├── hooks/
│   │   ├── useAbly.ts
│   │   ├── useSessions.ts
│   │   └── useNotificationHistory.ts
│   ├── services/
│   │   ├── ably.ts
│   │   ├── notifications.ts
│   │   └── storage.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── format.ts
├── CLAUDE.md              # This file
└── README.md              # User setup guide
```

## Testing

### Hook Testing
1. Start a Claude Code session
2. Check Ably debug console for `session_start` message
3. Use some tools, verify `activity_ping` messages (max 1 per 15s)
4. Let Claude finish, verify `status_update` with `notification_type: "finished"`
5. End session, verify `session_end` message
6. CTRL+C a session, verify app marks it stale after 60s

### App Testing
1. Install app on physical iOS device (push notifications require real device)
2. Enter Ably API key in setup screen
3. Copy Expo Push Token to Mac config
4. Start Claude Code session, verify it appears in Sessions tab
5. Trigger a permission prompt, verify push notification
6. Pull-to-refresh History tab, verify Ably backfill works

## Common Issues

### Hook Not Firing
- Check `~/.claude/settings.json` has the hook configuration
- Verify the notify.sh path is absolute and executable
- Check `~/.claude-notifier/config.json` has valid Ably API key

### No Push Notifications
- Expo Push Token must be from a physical device (not simulator)
- Token must be added to `~/.claude-notifier/config.json`
- Check Expo push service status at status.expo.dev

### Sessions Not Appearing
- Verify Ably connection status in app (green dot = connected)
- Check Ably debug console for messages on `claude-sessions` channel
- Ensure API key has publish and subscribe permissions

### Stale Sessions Not Clearing
- App must be open for stale detection to run
- Check that `activity_ping` messages are being sent
- Verify 60s timeout hasn't been changed

## Dependencies

### Hooks
- `jq` - JSON parsing in bash
- `curl` - HTTP requests

### App
- `expo` ~52.x
- `expo-router` ~4.x
- `expo-notifications` ~0.29.x
- `ably` ^2.x
- `@react-native-async-storage/async-storage` ^2.x

## Configuration Files

### ~/.claude-notifier/config.json
```json
{
  "ably_api_key": "your-api-key",
  "expo_push_token": "ExponentPushToken[xxx]"
}
```

### ~/.claude/settings.json (hooks section)
```json
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "/path/to/notify.sh"}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "/path/to/notify.sh"}]}],
    "PostToolUse": [{"matcher": "*", "hooks": [{"type": "command", "command": "/path/to/notify.sh"}]}],
    "Notification": [{"matcher": "permission_prompt|elicitation_dialog", "hooks": [{"type": "command", "command": "/path/to/notify.sh"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "/path/to/notify.sh"}]}]
  }
}
```
