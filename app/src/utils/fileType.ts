const ARCHIVE = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp'];
const VIDEO = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const AUDIO = ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'];
const SHEET = ['xls', 'xlsx', 'csv'];
const SLIDES = ['ppt', 'pptx', 'key'];
const DOC = ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages'];
const CODE = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'html', 'css', 'json', 'yml', 'yaml', 'sh'];

/** Small visual cue so file types are recognizable at a glance. */
export const fileTypeIcon = (filename: string, mimeType?: string | null): string => {
  const ext = (filename.toLowerCase().split('.').pop() ?? '').trim();

  if (ARCHIVE.includes(ext)) return '📦';
  if (IMAGE.includes(ext)) return '🖼';
  if (VIDEO.includes(ext)) return '🎬';
  if (AUDIO.includes(ext)) return '🎵';
  if (SHEET.includes(ext)) return '📊';
  if (SLIDES.includes(ext)) return '📽';
  if (ext === 'pdf') return '📕';
  if (DOC.includes(ext)) return '📄';
  if (CODE.includes(ext)) return '🧩';

  if (mimeType?.startsWith('image/')) return '🖼';
  if (mimeType?.startsWith('video/')) return '🎬';
  if (mimeType?.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📕';
  return '📄';
};
