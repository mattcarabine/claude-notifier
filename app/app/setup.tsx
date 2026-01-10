import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { setAblyApiKey } from '@/services/storage';
import { registerForPushNotifications } from '@/services/notifications';
import * as Clipboard from 'expo-clipboard';

export default function SetupScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const inputBackgroundColor = colorScheme === 'dark' ? '#333' : '#f5f5f5';

  const [apiKey, setApiKey] = useState('');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);

  useEffect(() => {
    async function getToken(): Promise<void> {
      const token = await registerForPushNotifications();
      setExpoPushToken(token);
      setTokenLoading(false);
    }
    getToken();
  }, []);

  async function handleCopyToken(): Promise<void> {
    if (expoPushToken) {
      await Clipboard.setStringAsync(expoPushToken);
      Alert.alert('Copied!', 'Expo Push Token copied to clipboard');
    }
  }

  async function handleSave(): Promise<void> {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      Alert.alert('Error', 'Please enter your Ably API key');
      return;
    }

    if (!trimmedKey.includes(':')) {
      Alert.alert('Error', 'Invalid Ably API key format. It should contain a colon (:)');
      return;
    }

    setLoading(true);
    try {
      await setAblyApiKey(trimmedKey);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  }

  function renderTokenSection(): React.JSX.Element {
    if (tokenLoading) {
      return <ActivityIndicator style={styles.tokenLoader} />;
    }

    if (!expoPushToken) {
      return (
        <View>
          <Text style={[styles.hint, { color: '#ef4444' }]}>
            Could not get push token. This can happen if:
          </Text>
          <Text style={[styles.hint, { color: colors.tabIconDefault, marginTop: 8 }]}>
            {'\u2022'} You're running on a simulator (use a real device){'\n'}
            {'\u2022'} EAS is not configured (run "npx eas init" in the app folder){'\n'}
            {'\u2022'} Notification permissions were denied
          </Text>
          <Text style={[styles.hint, { color: colors.tabIconDefault, marginTop: 8 }]}>
            You can still use the app to view sessions - push notifications just won't work until this is resolved.
          </Text>
        </View>
      );
    }

    return (
      <>
        <Pressable
          style={[styles.tokenBox, { backgroundColor: inputBackgroundColor }]}
          onPress={handleCopyToken}
        >
          <Text style={[styles.tokenText, { color: colors.text }]} numberOfLines={2}>
            {expoPushToken}
          </Text>
          <Text style={[styles.tapToCopy, { color: colors.tint }]}>
            Tap to copy
          </Text>
        </Pressable>
        <Text style={[styles.hint, { color: colors.tabIconDefault }]}>
          Copy this token to ~/.claude-notifier/config.json on your Mac
        </Text>
      </>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Claude Notifier Setup
      </Text>

      <Text style={[styles.description, { color: colors.tabIconDefault }]}>
        Enter your Ably API key to connect to your Claude Code sessions.
      </Text>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Ably API Key</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackgroundColor, color: colors.text }]}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="xxxxx:yyyyy"
          placeholderTextColor={colors.tabIconDefault}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.hint, { color: colors.tabIconDefault }]}>
          Get this from your Ably dashboard at ably.com
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>
          Expo Push Token
        </Text>
        {renderTokenSection()}
      </View>

      <Pressable
        style={[
          styles.button,
          { backgroundColor: colors.tint },
          loading && styles.buttonDisabled,
        ]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save & Continue</Text>
        )}
      </Pressable>

      <View style={styles.instructions}>
        <Text style={[styles.instructionsTitle, { color: colors.text }]}>
          Setup Instructions
        </Text>
        <Text style={[styles.instructionsText, { color: colors.tabIconDefault }]}>
          1. Create an Ably account at ably.com{'\n'}
          2. Create a new app in Ably dashboard{'\n'}
          3. Copy the API key and paste above{'\n'}
          4. Copy the Expo Push Token to your Mac's config{'\n'}
          5. Run ./hooks/install.sh in the claude-notifier repo
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
  },
  tokenLoader: {
    marginVertical: 20,
  },
  tokenBox: {
    padding: 16,
    borderRadius: 12,
  },
  tokenText: {
    fontSize: 13,
    fontFamily: 'SpaceMono',
    marginBottom: 8,
  },
  tapToCopy: {
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 24,
  },
});
