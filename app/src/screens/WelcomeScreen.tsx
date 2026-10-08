import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useTheme } from '../theme';

export const WelcomeScreen = () => {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[theme.typography.title, styles.title, { color: theme.colors.text }]}>SecureDrop</Text>
        <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textMuted }]}>
          Share files securely. Access stays under your control.
        </Text>

        <View style={styles.actions}>
          <Button label="Sign in" onPress={() => router.push('/login')} />
          <Button label="Create account" variant="secondary" onPress={() => router.push('/register')} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: 32 },
  title: { fontSize: 34, lineHeight: 40 },
  subtitle: { marginTop: 12, marginBottom: 32 },
  actions: { gap: 12 },
});
