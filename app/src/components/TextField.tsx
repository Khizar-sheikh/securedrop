import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
}

export const TextField = ({ label, error, ...inputProps }: TextFieldProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[theme.typography.caption, styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        {...inputProps}
        style={[
          styles.input,
          theme.typography.body,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            color: theme.colors.text,
          },
        ]}
      />
      {error ? (
        <Text style={[theme.typography.caption, styles.error, { color: theme.colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { marginBottom: 6, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { marginTop: 6 },
});
