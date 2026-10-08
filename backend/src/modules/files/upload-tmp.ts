import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Stable temp directory for in-flight uploads; contents are deleted per request. */
const dir = join(tmpdir(), 'securedrop-uploads');
mkdirSync(dir, { recursive: true });

export const UPLOAD_TMP_DIR = dir;
