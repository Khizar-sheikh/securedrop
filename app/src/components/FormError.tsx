import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface FormErrorProps {
  message: string | null | undefined;
}

/** Inline error shown under an auth form. */
export const FormError = ({ message }: FormErrorProps) => {
  const theme = useTheme();
  if (!message) return null;

  return (
    <View accessibilityRole="alert" style={[styles.container, { backgroundColor: theme.colors.dangerSurface }]}>
      <Text style={[theme.typography.caption, { color: theme.colors.danger }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
});
