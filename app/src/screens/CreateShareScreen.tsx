import { setStringAsync } from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ApiError } from '../services/api';
import { sharesApi } from '../services/sharesApi';
import { useTheme } from '../theme';
import type { PublicShare } from '../types/shares';
import { shareLink } from '../utils/shareLink';

interface Choice<T> {
  label: string;
  value: T;
}

const EXPIRY_CHOICES: Choice<number | null>[] = [
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86_400 },
  { label: '7 days', value: 604_800 },
  { label: '30 days', value: 2_592_000 },
  { label: 'Never', value: null },
];

const ACCESS_CHOICES: Choice<number | null>[] = [
  { label: 'One time', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: 'Unlimited', value: null },
];

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Could not create the link. Please try again.';

const expiryLabel = (seconds: number | null): string =>
  EXPIRY_CHOICES.find((choice) => choice.value === seconds)?.label ?? 'Never';

export const CreateShareScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const { fileId, filename } = useLocalSearchParams<{ fileId: string; filename?: string }>();

  const [expiry, setExpiry] = useState<number | null>(86_400);
  const [maxAccesses, setMaxAccesses] = useState<number | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [strict, setStrict] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<PublicShare | null>(null);
  const [createdExpiry, setCreatedExpiry] = useState<string>('Never');
  const [copied, setCopied] = useState(false);

  const createLink = async () => {
    setError(null);
    setPasswordError(null);

    if (requirePassword && password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const share = await sharesApi.create({
        fileId: String(fileId),
        expiresInSeconds: expiry,
        maxAccesses,
        allowDownload,
        strict,
        password: requirePassword ? password : null,
        oneTime: maxAccesses === 1,
      });
      const seconds = share.expiresAt
        ? Math.round((new Date(share.expiresAt).getTime() - Date.now()) / 1000)
        : null;
      setCreatedExpiry(expiryLabel(seconds));
      setCreated(share);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const link = created?.token ? shareLink(created.token) : '';

  const copyLink = async () => {
    await setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkNow = async () => {
    try {
      await Share.share({ message: link });
    } catch {
      Alert.alert('Sharing is not available on this device.');
    }
  };

  const choose = <T,>(current: T, next: T): boolean => Object.is(current, next);

  if (created) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Your secure link is ready</Text>
          <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textMuted }]}>
            {filename ?? 'File'} · Anyone with this link can request access according to the rules below.
          </Text>

          <View style={[styles.linkBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <Text selectable style={[theme.typography.mono, { color: theme.colors.text }]}>
              {link}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button label={copied ? 'Copied' : 'Copy Link'} onPress={() => void copyLink()} />
            <Button label="Share" variant="secondary" onPress={() => void shareLinkNow()} />
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>ACCESS RULES</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              · Expires: {createdExpiry}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              · Accesses: {created.maxAccesses === null ? 'Unlimited' : `${created.maxAccesses} max`}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              · Downloads: {created.allowDownload ? 'Allowed' : 'Blocked'}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              · Password: {created.hasPassword ? 'Required' : 'None'}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              · Strict mode: {created.strict ? 'On' : 'Off'}
            </Text>
          </View>

          <Button label="Done" variant="secondary" onPress={() => router.replace('/shares')} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="link" onPress={() => router.back()} style={[theme.typography.body, styles.back, { color: theme.colors.primary }]}>
            ‹ Back
          </Text>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Share a file</Text>
          <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textMuted }]}>
            {filename ?? 'File'}
          </Text>

          <FormError message={error} />

          <Text style={[theme.typography.caption, styles.groupLabel, { color: theme.colors.textMuted }]}>EXPIRES</Text>
          <View style={styles.choices}>
            {EXPIRY_CHOICES.map((choice) => (
              <ChoiceChip
                key={choice.label}
                label={choice.label}
                selected={choose(expiry, choice.value)}
                onPress={() => setExpiry(choice.value)}
              />
            ))}
          </View>

          <Text style={[theme.typography.caption, styles.groupLabel, { color: theme.colors.textMuted }]}>MAXIMUM ACCESSES</Text>
          <View style={styles.choices}>
            {ACCESS_CHOICES.map((choice) => (
              <ChoiceChip
                key={choice.label}
                label={choice.label}
                selected={choose(maxAccesses, choice.value)}
                onPress={() => setMaxAccesses(choice.value)}
              />
            ))}
          </View>

          <ToggleRow
            label="Allow download"
            value={allowDownload}
            onValueChange={setAllowDownload}
          />
          <ToggleRow label="Strict security mode" value={strict} onValueChange={setStrict} />
          <ToggleRow
            label="Require password"
            value={requirePassword}
            onValueChange={(next) => {
              setRequirePassword(next);
              if (!next) setPassword('');
            }}
          />

          {requirePassword ? (
            <TextField
              label="Share password"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              secureTextEntry
              placeholder="At least 8 characters"
            />
          ) : null}

          <Button
            label={submitting ? 'Creating…' : 'Create Secure Link'}
            onPress={() => void createLink()}
            loading={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const ChoiceChip = ({ label, selected, onPress }: ChoiceChipProps) => {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          color: selected ? theme.colors.primaryText : theme.colors.text,
        },
      ]}
    >
      {label}
    </Text>
  );
};

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const ToggleRow = ({ label, value, onValueChange }: ToggleRowProps) => {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text style={[theme.typography.body, { color: theme.colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 40 },
  back: { marginBottom: 12, fontWeight: '600' },
  subtitle: { marginTop: 6, marginBottom: 20 },
  groupLabel: { marginTop: 8, marginBottom: 8, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actions: { gap: 10, marginBottom: 20 },
  linkBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 20,
  },
});
