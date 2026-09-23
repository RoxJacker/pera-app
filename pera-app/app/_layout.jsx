import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/theme';

// Mantener el splash hasta que las fuentes estén listas
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Fraunces_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={Colors.cream} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="producto/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="entrada" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="servicios" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="historial" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="agenda" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="config" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="ticket" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
