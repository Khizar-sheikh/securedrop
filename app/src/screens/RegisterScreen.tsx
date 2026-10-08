import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../features/auth/AuthProvider';
import { validateEmail, validatePassword, validatePasswordConfirmation } from '../features/auth/validation';
import { useTheme } from '../theme';

export const RegisterScreen = () => {
  const theme = useTheme();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextConfirmationError = validatePasswordConfirmation(password, confirmation);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmationError(nextConfirmationError);
    setFormError(null);
    if (nextEmailError || nextPasswordError || nextConfirmationError) return;

    setSubmitting(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      router.replace('/files');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.brandMark, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="shield-checkmark" size={22} color={theme.colors.primaryText} />
            </View>
            <Text style={[theme.typography.heading, { color: theme.colors.text }]}>SecureDrop</Text>
          </View>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Create account</Text>
          <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textMuted }]}>
            Choose a password of at least 8 characters.
          </Text>

          <FormError message={formError} />

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="you@example.com"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            returnKeyType="next"
          />
          <TextField
            label="Confirm password"
            value={confirmation}
            onChangeText={setConfirmation}
            error={confirmationError}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <Button label={submitting ? 'Creating account…' : 'Create account'} onPress={submit} loading={submitting} />

          <View style={styles.footer}>
            <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Already have an account?{' '}</Text>
            <Text
              accessibilityRole="link"
              onPress={() => router.replace('/login')}
              style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '600' }]}
            >
              Sign in
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { marginTop: 8, marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' },
});
