import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

const ARCHIVE = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp'];
const VIDEO = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const AUDIO = ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'];
const SHEET = ['xls', 'xlsx', 'csv'];
const SLIDES = ['ppt', 'pptx', 'key'];
const DOC = ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages'];
const CODE = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'html', 'css', 'json', 'yml', 'yaml', 'sh'];

export type FileIconName = ComponentProps<typeof Ionicons>['name'];

/** Maps a file to a recognizable icon so types are obvious at a glance. */
export const fileTypeIcon = (filename: string, mimeType?: string | null): FileIconName => {
  const ext = (filename.toLowerCase().split('.').pop() ?? '').trim();

  if (ARCHIVE.includes(ext)) return 'archive-outline';
  if (IMAGE.includes(ext)) return 'image-outline';
  if (VIDEO.includes(ext)) return 'videocam-outline';
  if (AUDIO.includes(ext)) return 'musical-notes-outline';
  if (SHEET.includes(ext)) return 'grid-outline';
  if (SLIDES.includes(ext)) return 'easel-outline';
  if (ext === 'pdf') return 'document-outline';
  if (DOC.includes(ext)) return 'document-text-outline';
  if (CODE.includes(ext)) return 'code-slash-outline';

  if (mimeType?.startsWith('image/')) return 'image-outline';
  if (mimeType?.startsWith('video/')) return 'videocam-outline';
  if (mimeType?.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType === 'application/pdf') return 'document-outline';
  return 'document-outline';
};
