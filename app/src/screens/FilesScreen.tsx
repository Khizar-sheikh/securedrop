import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { useFileList } from '../features/files/useFileList';
import { UploadCancelledError, uploadFile, type PickableAsset, type UploadJob } from '../services/uploadApi';
import { useTheme } from '../theme';
import type { PublicFile } from '../types/files';
import { formatBytes, formatDate } from '../utils/format';

interface PendingUpload extends PickableAsset {
  size?: number;
}

type UploadState = 'idle' | 'uploading' | 'error' | 'success';

export const FilesScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const files = useFileList();
  const { refresh } = files;

  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const jobRef = useRef<UploadJob | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const startUpload = useCallback(
    (asset: PendingUpload) => {
      setPending(asset);
      setState('uploading');
      setProgress(0);
      setMessage(null);

      const job = uploadFile(asset, setProgress);
      jobRef.current = job;
      job.promise
        .then((file) => {
          setState('success');
          setPending(null);
          setMessage(`Uploaded ${file.filename}`);
          files.prepend(file);
          void files.refresh();
        })
        .catch((error: unknown) => {
          if (error instanceof UploadCancelledError) {
            setState('idle');
            setPending(null);
            setMessage(null);
            return;
          }
          setState('error');
          setMessage(error instanceof Error ? error.message : 'The upload failed. Please try again.');
        })
        .finally(() => {
          jobRef.current = null;
        });
    },
    [files],
  );

  const pickFile = useCallback(async () => {
    const result = await getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    startUpload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
  }, [startUpload]);

  const cancelUpload = useCallback(() => {
    jobRef.current?.cancel();
  }, []);

  const retryUpload = useCallback(() => {
    if (pending) startUpload(pending);
  }, [pending, startUpload]);

  const renderItem = ({ item }: { item: PublicFile }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/file/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>
          {item.filename}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          {formatBytes(item.sizeBytes)} · {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>›</Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Your Files</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {files.loading ? 'Loading…' : `${files.items.length} file${files.items.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Button label="Upload" onPress={pickFile} disabled={state === 'uploading'} />
      </View>

      {state === 'uploading' && pending ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
          <Text numberOfLines={1} style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>
            {pending.name}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {pending.size !== undefined ? formatBytes(pending.size) : 'Uploading…'} · {progress}%
          </Text>
          <ProgressBar progress={progress} />
          <Pressable accessibilityRole="button" onPress={cancelUpload} hitSlop={8}>
            <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '600' }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.retryBlock}>
          <FormError message={message} />
          <Button label="Retry upload" variant="secondary" onPress={retryUpload} />
        </View>
      ) : null}

      {state === 'success' && message ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.success }]}>
          <Text style={[theme.typography.body, { color: theme.colors.success }]}>{message}</Text>
        </View>
      ) : null}

      <FormError message={files.error} />

      {files.loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={files.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={files.refreshing}
              onRefresh={() => void files.refresh(true)}
              tintColor={theme.colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void files.loadMore()}
          ListEmptyComponent={
            <Text style={[theme.typography.body, styles.empty, { color: theme.colors.textMuted }]}>
              No files yet. Tap Upload to add one.
            </Text>
          }
          ListFooterComponent={files.loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : null}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  retryBlock: { marginBottom: 12 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: { gap: 4, flex: 1 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 32 },
  loading: { marginTop: 32 },
});
