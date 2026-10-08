import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { MarkdownView } from '../components/MarkdownView';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ApiError } from '../services/api';
import { sharesApi } from '../services/sharesApi';
import { useTheme } from '../theme';
import type { OpenedShare, ShareInspection, ShareRules } from '../types/shares';
import { formatBytes, formatRelativeExpiry } from '../utils/format';
import { shareSessionStore } from '../utils/shareSession';

type Phase = 'loading' | 'confirm' | 'password' | 'ready' | 'error';

const TERMINAL_CODES = new Set([
  'SHARE_INVALID',
  'SHARE_REVOKED',
  'SHARE_EXPIRED',
  'SHARE_CONSUMED',
  'SHARE_ACCESS_LIMIT_REACHED',
]);

const SESSION_CODES = new Set([
  'RECIPIENT_SESSION_INVALID',
  'RECIPIENT_SESSION_EXPIRED',
  'REAUTHENTICATION_REQUIRED',
]);

const errorCode = (caught: unknown): string => (caught instanceof ApiError ? caught.code : 'NETWORK_ERROR');

const errorMessage = (caught: unknown): string =>
  caught instanceof ApiError ? caught.message : 'Cannot reach the server. Check your connection.';

export const ShareAccessScreen = () => {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [inspection, setInspection] = useState<ShareInspection | null>(null);
  const [opened, setOpened] = useState<OpenedShare | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [terminal, setTerminal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);

  const runInspect = useCallback(
    async (options: { notice?: string } = {}) => {
      setPhase('loading');
      setError(null);
      setTerminal(false);
      setSavedUri(null);
      setOpened(null);
      setNotice(options.notice ?? null);

      if (!token) {
        setError('This secure link is not valid.');
        setPhase('error');
        return;
      }

      try {
        const result = await sharesApi.inspectShare(token);
        setInspection(result);
        setPhase(result.requiresPassword ? 'password' : 'confirm');
      } catch (caught) {
        setTerminal(TERMINAL_CODES.has(errorCode(caught)));
        setError(errorMessage(caught));
        setPhase('error');
      }
    },
    [token],
  );

  const runOpen = useCallback(
    async (options: { password?: string } = {}): Promise<void> => {
      setBusy(true);
      setError(null);

      try {
        const attempt = async (allowSessionRestore: boolean): Promise<void> => {
          const stored = allowSessionRestore ? await shareSessionStore.load(token) : null;
          const result = await sharesApi.openShare({
            token,
            password: options.password,
            sessionSecret: stored ?? undefined,
          });

          await shareSessionStore.save(token, result.session.secret);
          setOpened(result);
          setSavedUri(null);
          setNotice(null);
          setPassword('');
          setPhase('ready');
        };

        let allowSessionRestore = true;
        for (;;) {
          try {
            await attempt(allowSessionRestore);
            break;
          } catch (caught) {
            const code = errorCode(caught);

            if (code === 'SHARE_PASSWORD_REQUIRED') {
              setPhase('password');
              break;
            }
            if (code === 'SHARE_PASSWORD_INVALID') {
              setError(errorMessage(caught));
              setPhase('password');
              break;
            }
            if (SESSION_CODES.has(code) && allowSessionRestore) {
              allowSessionRestore = false;
              await shareSessionStore.clear(token);
              continue;
            }

            setTerminal(TERMINAL_CODES.has(code));
            setError(errorMessage(caught));
            setPhase('error');
            break;
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const runDownload = useCallback(async () => {
    if (!opened) return;

    setDownloading(true);
    setError(null);

    try {
      const uri = await sharesApi.downloadShareFile(
        { token, sessionSecret: opened.session.secret },
        opened.file.filename,
      );
      setSavedUri(uri);
    } catch (caught) {
      const code = errorCode(caught);

      if (TERMINAL_CODES.has(code)) {
        setTerminal(true);
        setError(errorMessage(caught));
        setPhase('error');
        return;
      }
      if (SESSION_CODES.has(code)) {
        await shareSessionStore.clear(token);
        await runInspect({ notice: 'Your access session ended. The link has been opened again.' });
        return;
      }

      setError(errorMessage(caught));
    } finally {
      setDownloading(false);
    }
  }, [opened, token, runInspect]);

  const openSaved = useCallback(async () => {
    if (!savedUri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(savedUri);
      }
    } catch {
      setError('The file could not be opened.');
    }
  }, [savedUri]);

  useEffect(() => {
    const timer = setTimeout(() => void runInspect(), 0);
    return () => clearTimeout(timer);
  }, [runInspect]);

  const noteInfo = opened?.note ?? inspection?.note ?? null;
  const isNote = noteInfo !== null;
  const noun = isNote ? 'note' : 'file';

  const badgesFor = (rules: ShareRules): string[] => {
    const badges: string[] = [];
    if (rules.hasPassword) badges.push('Password');
    if (rules.strict) badges.push('Strict');
    if (!rules.allowDownload) badges.push('No downloads');
    if (rules.oneTime) badges.push('One time');
    if (rules.maxAccesses !== null) badges.push(`${rules.accessCount}/${rules.maxAccesses} opens`);
    return badges;
  };

  const renderBadges = (rules: ShareRules) => {
    const badges = badgesFor(rules);
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

  const inspectionPhase = phase === 'confirm' || phase === 'password';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>SECUREDROP</Text>
        <Text style={[theme.typography.title, styles.heading, { color: theme.colors.text }]}>
          {isNote ? 'Shared note' : 'Shared file'}
        </Text>

        <FormError message={error} />

        {notice ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.text }]}>{notice}</Text>
          </View>
        ) : null}

        {phase === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Opening secure link…</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {terminal ? 'Ask the person who shared this link to create a new one.' : 'Something went wrong.'}
            </Text>
            {terminal ? null : (
              <Button label="Try again" variant="secondary" onPress={() => void runInspect()} />
            )}
          </View>
        ) : null}

        {inspectionPhase && inspection ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              A {isNote ? 'NOTE' : 'FILE'} HAS BEEN SHARED WITH YOU
            </Text>
            <Text numberOfLines={2} style={[theme.typography.body, styles.filename, { color: theme.colors.text }]}>
              {noteInfo ? noteInfo.title : inspection.file.filename}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {formatBytes(inspection.file.sizeBytes)} · {inspection.file.mimeType}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {formatRelativeExpiry(inspection.share.expiresAt)}
            </Text>

            {renderBadges(inspection.share)}

            {inspection.share.oneTime ? (
              <View style={[styles.warn, { backgroundColor: theme.colors.dangerSurface }]}>
                <Text style={[theme.typography.caption, { color: theme.colors.danger }]}>
                  One-time secure share — this {noun} can only be accessed once. After successful access, the
                  share will expire permanently.
                </Text>
              </View>
            ) : null}

            {phase === 'password' ? (
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="off"
                placeholder="Enter the share password"
              />
            ) : null}

            <Button
              label={phase === 'password' ? `Unlock ${noun}` : `Open ${noun}`}
              loading={busy}
              disabled={phase === 'password' && password.length === 0}
              onPress={() => {
                if (phase === 'password') {
                  void runOpen({ password });
                } else {
                  void runOpen();
                }
              }}
            />
          </View>
        ) : null}

        {phase === 'ready' && opened ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {isNote ? 'NOTE' : 'FILE'}
            </Text>
            <Text numberOfLines={2} style={[theme.typography.body, styles.filename, { color: theme.colors.text }]}>
              {noteInfo ? noteInfo.title : opened.file.filename}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {formatBytes(opened.file.sizeBytes)} · {opened.file.mimeType}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {formatRelativeExpiry(opened.share.expiresAt)}
            </Text>

            {renderBadges(opened.share)}

            {isNote && noteInfo && 'tags' in noteInfo && noteInfo.tags.length > 0 ? (
              <View style={styles.badges}>
                {noteInfo.tags.map((tag) => (
                  <Text
                    key={tag}
                    style={[
                      styles.badge,
                      theme.typography.caption,
                      { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.textMuted },
                    ]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}

            {opened.share.oneTime ? (
              <View style={[styles.warn, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[theme.typography.caption, { color: theme.colors.text }]}>
                  This one-time link has been used. You can still download it from this screen.
                </Text>
              </View>
            ) : null}

            {opened.note ? (
              <View style={styles.noteBody}>
                <MarkdownView content={opened.note.content} />
              </View>
            ) : null}

            {opened.share.allowDownload ? (
              savedUri ? (
                <View style={styles.actions}>
                  <Button label={isNote ? 'Open .md' : 'Open file'} onPress={() => void openSaved()} />
                  <Button
                    label={isNote ? 'Export .md again' : 'Download again'}
                    variant="secondary"
                    loading={downloading}
                    onPress={() => void runDownload()}
                  />
                </View>
              ) : (
                <Button
                  label={isNote ? 'Export .md' : 'Download'}
                  loading={downloading}
                  onPress={() => void runDownload()}
                />
              )
            ) : (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                Preview only — the owner has disabled downloads for this {noun}.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingTop: 24, paddingBottom: 40, gap: 6 },
  heading: { marginBottom: 12 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  filename: { fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  warn: { borderRadius: 10, padding: 12, marginTop: 4 },
  notice: { borderRadius: 10, padding: 12, marginBottom: 8 },
  actions: { gap: 8, marginTop: 4 },
  noteBody: { marginTop: 8 },
});
