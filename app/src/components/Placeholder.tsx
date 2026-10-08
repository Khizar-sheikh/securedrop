import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

/** Temporary content used while a screen is still being built out. */
export const Placeholder = ({ title, subtitle }: PlaceholderProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[theme.typography.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  subtitle: { marginTop: 8 },
});
