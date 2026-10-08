import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { ApiError } from '../services/api';
import { activityApi } from '../services/activityApi';
import { useTheme } from '../theme';
import {
  ActivityItem,
  activityLabel,
  activityReason,
  isActivitySignal,
} from '../types/activity';
import { formatActivityTime } from '../utils/format';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export const ActivityScreen = () => {
  const theme = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const result = await activityApi.list();
      setItems(result.items);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const signal = isActivitySignal(item.type);
    const reason = activityReason(item.reason);

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Text
            style={[
              theme.typography.body,
              styles.label,
              { color: signal ? theme.colors.danger : theme.colors.text },
            ]}
          >
            {activityLabel(item.type)}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {formatActivityTime(item.createdAt)}
          </Text>
        </View>

        {item.filename ? (
          <Text numberOfLines={1} style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {item.filename}
          </Text>
        ) : null}
        {reason ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{reason}</Text>
        ) : null}
        {item.ip ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>IP {item.ip}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="link" onPress={() => router.back()} hitSlop={8}>
          <Text style={[theme.typography.caption, { color: theme.colors.primary, fontWeight: '600' }]}>
            Back
          </Text>
        </Pressable>
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>Activity</Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          What happened to your files and links
        </Text>
      </View>

      <FormError message={error} />

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
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
            error ? null : (
              <Text style={[theme.typography.body, styles.empty, { color: theme.colors.textMuted }]}>
                No activity yet. Upload a file and share it to see events here.
              </Text>
            )
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 12, gap: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  label: { fontWeight: '600', flex: 1 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 32 },
  loading: { marginTop: 32 },
});
