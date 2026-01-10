# Claude Notifier

Get push notifications on your iPhone when Claude Code needs your input.

## Features

- Real-time session monitoring
- Push notifications when Claude:
  - Needs permission to run a command
  - Has a question for you
  - Finishes working and is waiting for input
- View all active Claude Code sessions
- History of past notifications

## Prerequisites

- macOS with Claude Code installed
- iPhone with [Expo Go](https://apps.apple.com/app/expo-go/id982107779) app
- [jq](https://jqlang.github.io/jq/) installed (`brew install jq`)
- Node.js 18+ installed

## Setup

### 1. Create an Ably Account

1. Go to [ably.com](https://ably.com) and create a free account
2. Create a new app (any name)
3. Go to the app's "API Keys" tab
4. Copy the API key (format: `xxxxx:yyyyy`)

### 2. Install the Hooks

```bash
# Clone this repository
git clone <repo-url>
cd claude-notifier

# Run the install script
./hooks/install.sh
```

The install script will:
- Copy the hook script to `~/.claude/scripts/claude-notifier/`
- Add hook configurations to `~/.claude/settings.json`
- Create a config template at `~/.claude-notifier/config.json`

### 3. Configure Ably API Key

Edit the config file with your Ably API key:

```bash
nano ~/.claude-notifier/config.json
```

Replace `YOUR_ABLY_API_KEY_HERE` with your actual API key:

```json
{
  "ably_api_key": "xxxxx:yyyyy",
  "expo_push_token": "YOUR_EXPO_PUSH_TOKEN_HERE"
}
```

### 4. Run the Mobile App

```bash
cd app
npm install
```

#### Enable Push Notifications (Required for notifications)

To receive push notifications, you need to configure Expo Application Services (EAS):

```bash
npx eas init
```

This will prompt you to:
1. Log in to your Expo account (or create one for free)
2. Create/link an EAS project

> **Note:** If you skip this step, the app will still work for viewing sessions in real-time, but you won't receive push notifications. The app will show a warning banner reminding you to complete this setup.

#### Start the app

```bash
npx expo start
```

Scan the QR code with your iPhone camera to open in Expo Go.

### 5. Complete App Setup

1. Enter your Ably API key in the app
2. The app will display your **Expo Push Token**
3. Tap the token to copy it
4. Add it to your Mac's config file:

```bash
nano ~/.claude-notifier/config.json
```

```json
{
  "ably_api_key": "xxxxx:yyyyy",
  "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxx]"
}
```

### 6. Test It!

Start a Claude Code session on your Mac. You should:
- See the session appear in the app's Sessions tab
- Receive a push notification when Claude finishes working

## How It Works

```
Claude Code ──► Hooks ──► Ably ──► Mobile App
                │
                └──► Expo Push ──► Push Notification
```

1. **Hooks** run on every Claude Code event (session start/end, tool use, etc.)
2. **Ably** receives real-time messages about session state
3. **Mobile App** subscribes to Ably channel and displays sessions
4. **Expo Push** sends notifications for important events

### Session Lifecycle

| Event | Description |
|-------|-------------|
| Session Start | New session appears in app |
| Activity Ping | Session marked as "active" (sent every 15s during work) |
| Stop | Session marked as "waiting", push notification sent |
| Notification | Permission/question dialog, push notification sent |
| Session End | Session removed from app |

### Stale Session Detection

If a session doesn't send an activity ping for 60 seconds, it's automatically removed from the app. This handles cases where Claude Code is terminated with CTRL+C (which may not trigger the SessionEnd hook).

## Notification Types

| Type | When |
|------|------|
| **Approval needed** | Claude needs permission to run a command |
| **Question** | Claude is asking you a question |
| **Finished** | Claude finished working and is waiting for your input |

## Troubleshooting

### Hooks not working

1. Check the hook is installed:
   ```bash
   cat ~/.claude/settings.json | jq '.hooks'
   ```

2. Verify the script is executable:
   ```bash
   ls -la ~/.claude/scripts/claude-notifier/notify.sh
   ```

3. Test the config:
   ```bash
   cat ~/.claude-notifier/config.json
   ```

### No push notifications

1. Make sure EAS is configured: run `npx eas init` in the `app/` directory
2. Make sure you're using a physical iPhone (not simulator)
3. Verify the Expo Push Token is in your config file
4. Check Expo's push service: [status.expo.dev](https://status.expo.dev)

### Can't get Expo Push Token

If the app shows "Push Notifications Unavailable" or you can't copy a token:

1. Run `npx eas init` in the `app/` directory to configure EAS
2. Make sure you're on a physical device, not a simulator
3. Check that notification permissions are granted in iOS Settings

### Sessions not appearing in app

1. Check the connection status indicator (should be green)
2. Verify your Ably API key is correct
3. Check the Ably debug console for messages

### App shows "Disconnected"

1. Verify your Ably API key is valid
2. Check your internet connection
3. Try closing and reopening the app

## Uninstalling

```bash
./hooks/uninstall.sh
```

This will:
- Remove hooks from `~/.claude/settings.json`
- Delete installed scripts from `~/.claude/scripts/claude-notifier/`
- Optionally remove config and session data

## Development

See [CLAUDE.md](./CLAUDE.md) for development documentation.

### Running the app in development

```bash
cd app
npm install
npx expo start
```

### Project Structure

```
claude-notifier/
├── hooks/
│   ├── notify.sh      # Main hook script
│   ├── install.sh     # Installation script
│   └── uninstall.sh   # Uninstallation script
├── app/               # React Native Expo app
├── CLAUDE.md          # Development documentation
└── README.md          # This file
```

## License

MIT
