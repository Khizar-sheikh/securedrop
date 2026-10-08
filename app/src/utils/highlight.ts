export type CodeTokenType = 'plain' | 'keyword' | 'string' | 'comment' | 'number';

export interface CodeToken {
  text: string;
  type: CodeTokenType;
}

const JS_KEYWORDS = [
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface',
  'is', 'let', 'new', 'null', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'satisfies',
  'set', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
];

const PYTHON_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
  'is', 'lambda', 'match', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
  'try', 'while', 'with', 'yield',
];

const C_LIKE_KEYWORDS = [
  'auto', 'bool', 'break', 'case', 'catch', 'chan', 'char', 'class', 'const', 'continue', 'default',
  'defer', 'delete', 'do', 'double', 'else', 'enum', 'export', 'extern', 'false', 'final', 'finally',
  'float', 'for', 'func', 'function', 'go', 'if', 'import', 'int', 'interface', 'let', 'long',
  'map', 'mod', 'namespace', 'new', 'nil', 'null', 'package', 'private', 'protected', 'public',
  'return', 'short', 'signed', 'sizeof', 'static', 'string', 'struct', 'switch', 'this', 'throw',
  'true', 'try', 'typedef', 'uint', 'union', 'unsigned', 'use', 'var', 'void', 'while',
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hashCommentLanguages = new Set(['py', 'python', 'sh', 'bash', 'shell', 'zsh', 'ruby', 'yaml', 'yml', 'perl']);

const keywordSetFor = (language: string): readonly string[] => {
  const lang = language.toLowerCase();
  if (['js', 'jsx', 'javascript', 'ts', 'tsx', 'typescript', 'json', 'node'].includes(lang)) return JS_KEYWORDS;
  if (['py', 'python'].includes(lang)) return PYTHON_KEYWORDS;
  return C_LIKE_KEYWORDS;
};

/**
 * Lightweight syntax highlighting for code blocks: strings, comments, keywords
 * and numbers. Deliberately regex-based so it stays fast and dependency-free.
 */
export const highlightCode = (code: string, language?: string): CodeToken[] => {
  if (!code) return [];

  const lang = (language ?? '').trim().toLowerCase();
  const keywords = keywordSetFor(lang);
  const commentPattern = hashCommentLanguages.has(lang) ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';

  const pattern = new RegExp(
    `(${commentPattern})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(${keywords
      .map(escapeRegExp)
      .join('|')})\\b|\\b(\\d[\\d_]*(?:\\.\\d+)?[fFlLdD]?)\\b`,
    'g',
  );

  const tokens: CodeToken[] = [];
  let lastIndex = 0;
  let match = pattern.exec(code);

  while (match !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), type: 'plain' });
    }
    if (match[1] !== undefined) {
      tokens.push({ text: match[1], type: 'comment' });
    } else if (match[2] !== undefined) {
      tokens.push({ text: match[2], type: 'string' });
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], type: 'keyword' });
    } else {
      tokens.push({ text: match[4], type: 'number' });
    }
    lastIndex = pattern.lastIndex;
    match = pattern.exec(code);
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), type: 'plain' });
  }

  return tokens;
};
