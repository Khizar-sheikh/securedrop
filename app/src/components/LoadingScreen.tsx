import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

/** Shown while the stored session is being validated at startup. */
export const LoadingScreen = ({ label = 'Checking your session…' }: { label?: string }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[theme.typography.title, { color: theme.colors.text }]}>SecureDrop</Text>
      <ActivityIndicator style={styles.spinner} color={theme.colors.primary} />
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  spinner: { marginVertical: 16 },
});
