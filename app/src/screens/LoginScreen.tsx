import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../features/auth/AuthProvider';
import { validateEmail, validatePassword } from '../features/auth/validation';
import { useTheme } from '../theme';

export const LoginScreen = () => {
  const theme = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/files');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Sign in</Text>
          <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textMuted }]}>
            Use your SecureDrop account to continue.
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
            textContentType="password"
            autoComplete="password"
            placeholder="Your password"
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <Button label={submitting ? 'Signing in…' : 'Sign in'} onPress={submit} loading={submitting} />

          <View style={styles.footer}>
            <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
              New to SecureDrop?{' '}
            </Text>
            <Text
              accessibilityRole="link"
              onPress={() => router.replace('/register')}
              style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '600' }]}
            >
              Create an account
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
  subtitle: { marginTop: 8, marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' },
});
