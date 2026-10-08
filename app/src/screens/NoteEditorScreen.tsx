import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { MarkdownView } from '../components/MarkdownView';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ApiError } from '../services/api';
import { filesApi } from '../services/filesApi';
import { notesApi } from '../services/notesApi';
import { useTheme } from '../theme';
import type { Note } from '../types/notes';
import type { PublicFile } from '../types/files';
import { formatBytes } from '../utils/format';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const parseTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const NoteEditorScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const routeId = typeof params.id === 'string' ? params.id : 'new';
  const isNew = routeId === 'new';

  const [noteId, setNoteId] = useState<string | null>(isNew ? null : routeId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [candidates, setCandidates] = useState<PublicFile[] | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const applyNote = useCallback((loaded: Note) => {
    setNote(loaded);
    setNoteId(loaded.id);
    setTitle(loaded.title);
    setContent(loaded.content);
    setTagsText(loaded.tags.join(', '));
  }, []);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        applyNote(await notesApi.get(id));
      } catch (caught) {
        setError(messageOf(caught));
      } finally {
        setLoading(false);
      }
    },
    [applyNote],
  );

  useEffect(() => {
    if (isNew) return;
    const timer = setTimeout(() => void load(routeId), 0);
    return () => clearTimeout(timer);
  }, [load, isNew, routeId]);

  const save = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give the note a title before saving.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setError('Title cannot exceed 200 characters.');
      return;
    }
    if (content.length > 200_000) {
      setError('Note content is too long.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const tags = parseTags(tagsText);
      const saved = noteId
        ? await notesApi.update(noteId, { title: trimmedTitle, content, tags })
        : await notesApi.create({ title: trimmedTitle, content, tags });
      applyNote(saved);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }, [applyNote, content, noteId, tagsText, title]);

  const confirmDelete = useCallback(() => {
    if (!noteId) return;
    Alert.alert('Delete this note?', 'The note will be removed and any share links for it stop working.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await notesApi.remove(noteId);
              router.replace('/notes');
            } catch (caught) {
              setError(messageOf(caught));
            }
          })();
        },
      },
    ]);
  }, [noteId, router]);

  const openAttach = useCallback(async () => {
    setAttachOpen((open) => !open);
    if (candidates !== null) return;
    setAttachBusy(true);
    try {
      const result = await filesApi.list(1, 20);
      const attachedIds = new Set(note?.files.map((entry) => entry.fileId) ?? []);
      setCandidates(result.items.filter((file) => !attachedIds.has(file.id)));
    } catch (caught) {
      setError(messageOf(caught));
      setAttachOpen(false);
    } finally {
      setAttachBusy(false);
    }
  }, [candidates, note]);

  const attach = useCallback(
    async (fileId: string) => {
      if (!noteId) return;
      setAttachBusy(true);
      setError(null);
      try {
        await notesApi.attach(noteId, fileId);
        applyNote(await notesApi.get(noteId));
        setCandidates((previous) => previous?.filter((file) => file.id !== fileId) ?? null);
      } catch (caught) {
        setError(messageOf(caught));
      } finally {
        setAttachBusy(false);
      }
    },
    [applyNote, noteId],
  );

  const detach = useCallback(
    async (fileId: string) => {
      if (!noteId) return;
      setAttachBusy(true);
      setError(null);
      try {
        await notesApi.detach(noteId, fileId);
        applyNote(await notesApi.get(noteId));
        setCandidates((previous) => {
          if (previous === null) return null;
          return previous.some((file) => file.id === fileId) ? [...previous] : previous;
        });
      } catch (caught) {
        setError(messageOf(caught));
      } finally {
        setAttachBusy(false);
      }
    },
    [applyNote, noteId],
  );

  const shareNote = useCallback(() => {
    if (!noteId) return;
    router.push({
      pathname: '/share/create',
      params: { noteId, filename: title.trim() || 'Note' },
    });
  }, [noteId, router, title]);

  const modeChip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.modeChip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text style={[theme.typography.caption, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
        {label}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Opening note…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text
            accessibilityRole="link"
            onPress={() => router.back()}
            style={[theme.typography.body, styles.back, { color: theme.colors.primary }]}
          >
            ‹ Back
          </Text>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>
            {isNew ? 'New note' : 'Edit note'}
          </Text>

          <FormError message={error} />

          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Meeting notes, snippet, idea…" />
          <TextField
            label="Tags"
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="comma, separated, tags"
          />

          <View style={styles.modeRow}>
            {modeChip('Edit', !preview, () => setPreview(false))}
            {modeChip('Preview', preview, () => setPreview(true))}
          </View>

          {preview ? (
            <View style={[styles.previewBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {content.trim() ? (
                <MarkdownView content={content} />
              ) : (
                <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Nothing to preview yet.</Text>
              )}
            </View>
          ) : (
            <TextInput
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              placeholder={'Write in Markdown — headings, **bold**, `code`, lists…'}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.contentInput,
                theme.typography.mono,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
              ]}
            />
          )}

          <Button label={saving ? 'Saving…' : 'Save note'} loading={saving} onPress={() => void save()} />

          {noteId && !isNew ? (
            <View style={styles.actions}>
              <Button label="Create secure link" variant="secondary" onPress={shareNote} />
              <Button label="Delete note" variant="danger" onPress={confirmDelete} />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[theme.typography.caption, styles.sectionLabel, { color: theme.colors.textMuted }]}>
              ATTACHED FILES
            </Text>

            {note?.files.map((entry) => (
              <View
                key={entry.id}
                style={[styles.attachmentRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[theme.typography.body, { color: theme.colors.text }]}>
                    {entry.filename}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                    {formatBytes(entry.sizeBytes)}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void detach(entry.fileId)}>
                  <Text style={[theme.typography.caption, { color: theme.colors.danger, fontWeight: '600' }]}>Remove</Text>
                </Pressable>
              </View>
            ))}

            {note && note.files.length === 0 ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                No files attached yet.
              </Text>
            ) : null}

            <Button
              label={noteId ? 'Attach a file' : 'Save the note first to attach files'}
              variant="secondary"
              disabled={!noteId || attachBusy}
              loading={attachBusy && attachOpen}
              onPress={() => void openAttach()}
            />

            {attachOpen && noteId ? (
              <View style={[styles.panel, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
                {attachBusy && candidates === null ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : null}
                {candidates?.map((file) => (
                  <Pressable
                    key={file.id}
                    accessibilityRole="button"
                    onPress={() => void attach(file.id)}
                    style={styles.candidateRow}
                  >
                    <Text numberOfLines={1} style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]}>
                      {file.filename}
                    </Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.primary, fontWeight: '600' }]}>
                      Attach
                    </Text>
                  </Pressable>
                ))}
                {candidates && candidates.length === 0 ? (
                  <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                    No more files available to attach.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 48 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  back: { marginBottom: 12, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contentInput: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    minHeight: 120,
  },
  actions: { gap: 10, marginTop: 10 },
  section: { marginTop: 24, gap: 10 },
  sectionLabel: { fontWeight: '700' },
  attachmentRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
});
