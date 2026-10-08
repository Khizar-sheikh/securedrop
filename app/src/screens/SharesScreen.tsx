import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Screen } from '../components/Screen';
import { ApiError } from '../services/api';
import { sharesApi } from '../services/sharesApi';
import { useTheme } from '../theme';
import { PublicShareListItem, shareStatus } from '../types/shares';
import { formatBytes, formatDate } from '../utils/format';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
  consumed: 'Used',
  unavailable: 'File deleted',
};

const statusColor = (status: string, colors: ReturnType<typeof useTheme>['colors']): string => {
  switch (status) {
    case 'active':
      return colors.success;
    case 'expired':
      return colors.warning;
    case 'revoked':
      return colors.danger;
    default:
      return colors.textMuted;
  }
};

export const SharesScreen = () => {
  const theme = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<PublicShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const result = await sharesApi.list();
      setItems(result.items);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
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

  const confirmRevoke = (share: PublicShareListItem) => {
    Alert.alert(
      'Revoke this link?',
      `Anyone using the link for "${share.filename}" will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void revoke(share.id) },
      ],
    );
  };

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await sharesApi.revoke(id);
      await load();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setRevokingId(null);
    }
  };

  const describe = (share: PublicShareListItem): string => {
    const accesses =
      share.maxAccesses === null ? `${share.accessCount} access${share.accessCount === 1 ? '' : 'es'}` : `${share.accessCount}/${share.maxAccesses}`;
    const when = share.expiresAt ? `Expires ${formatDate(share.expiresAt)}` : 'No expiry';
    return `${formatBytes(share.sizeBytes)} · ${accesses} · ${when}`;
  };

  const renderBadges = (share: PublicShareListItem) => {
    const badges: string[] = [];
    if (share.hasPassword) badges.push('Password');
    if (share.strict) badges.push('Strict');
    if (!share.allowDownload) badges.push('No downloads');
    if (share.oneTime) badges.push('One time');
    if (badges.length === 0) return null;

    return (
      <View style={styles.badges}>
        {badges.map((badge) => (
          <Text
            key={badge}
            style={[
              styles.badge,
              theme.typography.caption,
              { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.textMuted },
            ]}
          >
            {badge}
          </Text>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: PublicShareListItem }) => {
    const status = shareStatus(item, item.fileDeleted);
    const isActive = status === 'active';

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Text numberOfLines={1} style={[theme.typography.body, styles.filename, { color: theme.colors.text }]}>
            {item.filename}
          </Text>
          <Text style={[theme.typography.caption, { color: statusColor(status, theme.colors), fontWeight: '700' }]}>
            {STATUS_LABEL[status]}
          </Text>
        </View>

        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{describe(item)}</Text>
        {renderBadges(item)}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/file/[id]', params: { id: item.fileId } })}
            hitSlop={6}
          >
            <Text style={[theme.typography.caption, { color: theme.colors.primary, fontWeight: '600' }]}>View file</Text>
          </Pressable>

          {isActive ? (
            <Button
              label={revokingId === item.id ? 'Revoking…' : 'Revoke'}
              variant="danger"
              loading={revokingId === item.id}
              onPress={() => confirmRevoke(item)}
              style={styles.revokeButton}
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>Shares</Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          {loading ? 'Loading…' : `${items.length} link${items.length === 1 ? '' : 's'}`}
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
            <Text style={[theme.typography.body, styles.empty, { color: theme.colors.textMuted }]}>
              No share links yet. Open a file and tap “Create secure link”.
            </Text>
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 12, gap: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  filename: { fontWeight: '600', flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  revokeButton: { minHeight: 36, paddingVertical: 6 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 32 },
  loading: { marginTop: 32 },
});
