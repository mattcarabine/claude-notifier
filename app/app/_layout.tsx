import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { getAblyApiKey } from '@/services/storage';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function checkConfig() {
      const apiKey = await getAblyApiKey();
      setIsConfigured(!!apiKey);
    }
    checkConfig();
  }, []);

  useEffect(() => {
    if (loaded && isConfigured !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isConfigured]);

  if (!loaded || isConfigured === null) {
    return null;
  }

  return <RootLayoutNav isConfigured={isConfigured} />;
}

function RootLayoutNav({ isConfigured }: { isConfigured: boolean }) {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isConfigured) {
      router.replace('/setup');
    }
  }, [isConfigured]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="setup"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="session/[id]"
          options={{
            title: 'Session Details',
            headerBackTitle: 'Sessions',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
