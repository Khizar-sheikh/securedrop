import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { ApiError, NETWORK_ERROR_CODE, TIMEOUT_ERROR_CODE } from '../services/api';
import { notesApi } from '../services/notesApi';
import { useTheme } from '../theme';
import type { NoteSummary } from '../types/notes';
import { formatBytes, formatDate } from '../utils/format';

export const NotesScreen = () => {
  const theme = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCodeState] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const result = await notesApi.list(1, 50);
      setItems(result.items);
      setError(null);
      setErrorCodeState(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setErrorCodeState(caught instanceof ApiError ? caught.code : 'UNKNOWN');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const offline = errorCode === NETWORK_ERROR_CODE || errorCode === TIMEOUT_ERROR_CODE;

  const describe = (note: NoteSummary): string => {
    const attachments = note.attachmentCount > 0 ? ` · ${note.attachmentCount} file${note.attachmentCount === 1 ? '' : 's'}` : '';
    return `${formatBytes(note.contentBytes)}${attachments} · ${formatDate(note.updatedAt)}`;
  };

  const renderTags = (note: NoteSummary) => {
    if (note.tags.length === 0) return null;
    return (
      <View style={styles.tags}>
        {note.tags.slice(0, 3).map((tag) => (
          <Text
            key={tag}
            style={[
              styles.tag,
              theme.typography.caption,
              { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.textMuted },
            ]}
          >
            {tag}
          </Text>
        ))}
        {note.tags.length > 3 ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>+{note.tags.length - 3}</Text>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: { item: NoteSummary }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/note/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Ionicons name="reader-outline" size={20} color={theme.colors.textMuted} />
      </View>
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>
          {item.title}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{describe(item)}</Text>
        {renderTags(item)}
      </View>
      <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>›</Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Notes</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {loading ? 'Loading…' : `${items.length} note${items.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Button label="New note" onPress={() => router.push('/note/new')} />
      </View>

      {offline ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>
            You&apos;re offline. Your notes will appear when you reconnect.
          </Text>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <FormError message={error} />
      )}

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={styles.rowText}>
                <View style={[styles.skeletonLine, { width: '55%', backgroundColor: theme.colors.border }]} />
                <View style={[styles.skeletonLine, { width: '35%', backgroundColor: theme.colors.border }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Ionicons name="reader-outline" size={30} color={theme.colors.textMuted} />
              <Text style={[theme.typography.body, styles.empty, { color: theme.colors.textMuted }]}>
                {offline ? 'Notes will show up once you are back online.' : 'No notes yet. Tap New note to write one.'}
              </Text>
            </View>
          }
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
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rowText: { gap: 4, flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  skeletonLine: { height: 12, borderRadius: 6, marginBottom: 6 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center' },
  emptyBlock: { alignItems: 'center', gap: 10, marginTop: 40 },
});
