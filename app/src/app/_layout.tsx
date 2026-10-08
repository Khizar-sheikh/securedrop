import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from '../components/LoadingScreen';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { ThemeProvider, useTheme } from '../theme';

/** Routes that do not require a signed-in account. */
const PUBLIC_ROOTS = new Set(['', 'login', 'register']);

const Navigation = () => {
  const theme = useTheme();
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const root = segments[0] ?? '';

    if (status === 'unauthenticated' && !PUBLIC_ROOTS.has(root)) {
      router.replace('/login');
    } else if (status === 'authenticated' && (root === 'login' || root === 'register')) {
      router.replace('/');
    }
  }, [status, segments, router]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}