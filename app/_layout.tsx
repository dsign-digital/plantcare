import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { initializePurchases } from '../src/lib/purchases';
import { requestNotificationPermissions } from '../src/lib/notifications';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    initializePurchases();
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-plant" options={{ presentation: 'modal' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
