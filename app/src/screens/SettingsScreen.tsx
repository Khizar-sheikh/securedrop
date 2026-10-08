import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../theme';

export const SettingsScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>Settings</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Signed in as</Text>
          <Text style={[theme.typography.body, styles.email, { color: theme.colors.text }]} selectable>
            {user?.email ?? 'Unknown account'}
          </Text>
        </View>

        <Button label={signingOut ? 'Signing out…' : 'Sign out'} variant="danger" loading={signingOut} onPress={handleSignOut} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  email: { marginTop: 6, fontWeight: '600' },
});
