import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { ApiError } from '../services/api';
import { filesApi } from '../services/filesApi';
import { useTheme } from '../theme';
import type { PublicFile } from '../types/files';
import { formatBytes, formatDate } from '../utils/format';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        selectable
        style={[
          mono ? theme.typography.mono : theme.typography.body,
          { color: theme.colors.text, fontWeight: '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

export const FileDetailsScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [file, setFile] = useState<PublicFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await filesApi.get(String(id));
      setFile(data);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmDelete = () => {
    if (!file) return;
    Alert.alert(
      'Delete this file?',
      `"${file.filename}" will be removed permanently, and any share links to it will stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
      ],
    );
  };

  const performDelete = async () => {
    if (!file) return;
    setDeleting(true);
    try {
      await filesApi.remove(file.id);
      router.back();
    } catch (caught) {
      setError(messageOf(caught));
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="link"
          onPress={() => router.back()}
          style={[theme.typography.body, styles.back, { color: theme.colors.primary }]}
        >
          ‹ Files
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
        ) : null}

        <FormError message={error} />

        {file ? (
          <>
            <Text style={[theme.typography.title, styles.filename, { color: theme.colors.text }]} numberOfLines={3}>
              {file.filename}
            </Text>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <DetailRow label="Size" value={formatBytes(file.sizeBytes)} />
              <DetailRow label="Type" value={file.mimeType} />
              <DetailRow label="Uploaded" value={formatDate(file.createdAt)} />
              <DetailRow label="SHA-256" value={file.checksum} mono />
            </View>

            <Button label={deleting ? 'Deleting…' : 'Delete file'} variant="danger" loading={deleting} onPress={confirmDelete} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 32 },
  back: { marginBottom: 16, fontWeight: '600' },
  filename: { marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 14,
  },
  detailRow: { gap: 4 },
  loading: { marginTop: 32 },
});
