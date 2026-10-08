import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Markdown, { type MarkdownNode, type MarkdownProps, type MarkdownRule } from 'react-native-markdown-display';
import { useTheme } from '../theme';
import { highlightCode, type CodeTokenType } from '../utils/highlight';

interface MarkdownViewProps {
  content: string;
}

interface TokenPalette {
  keyword: string;
  string: string;
  comment: string;
  number: string;
}

const LIGHT_PALETTE: TokenPalette = {
  keyword: '#7C3AED',
  string: '#15803D',
  comment: '#6B7280',
  number: '#B45309',
};

const DARK_PALETTE: TokenPalette = {
  keyword: '#C084FC',
  string: '#4ADE80',
  comment: '#9CA3AF',
  number: '#FBBF24',
};

/** Renders markdown with themed styles and highlighted code blocks. */
export const MarkdownView = ({ content }: MarkdownViewProps) => {
  const theme = useTheme();
  const palette = theme.mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;

  const colorFor = (type: CodeTokenType): string => {
    switch (type) {
      case 'keyword':
        return palette.keyword;
      case 'string':
        return palette.string;
      case 'comment':
        return palette.comment;
      case 'number':
        return palette.number;
      default:
        return theme.colors.text;
    }
  };

  const renderCodeBlock = (node: MarkdownNode): ReactNode => {
    const language = node.sourceInfo?.trim();
    const tokens = highlightCode(node.content ?? '', language);

    return (
      <View
        key={node.key}
        style={[styles.codeBlock, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
      >
        {language ? (
          <Text style={[theme.typography.caption, styles.codeLanguage, { color: theme.colors.textMuted }]}>
            {language}
          </Text>
        ) : null}
        <Text selectable style={[theme.typography.mono, { color: theme.colors.text }]}>
          {tokens.map((token, index) => (
            <Text key={index} style={token.type === 'plain' ? undefined : { color: colorFor(token.type) }}>
              {token.text}
            </Text>
          ))}
        </Text>
      </View>
    );
  };

  const rules: Record<string, MarkdownRule> = {
    fence: (node) => renderCodeBlock(node),
    code_block: (node) => renderCodeBlock(node),
  };

  const markdownStyles: NonNullable<MarkdownProps['style']> = {
    body: { color: theme.colors.text },
    text: { color: theme.colors.text },
    heading1: { color: theme.colors.text, fontSize: 23, lineHeight: 30, fontWeight: '700', marginVertical: 8 },
    heading2: { color: theme.colors.text, fontSize: 20, lineHeight: 27, fontWeight: '700', marginVertical: 8 },
    heading3: { color: theme.colors.text, fontSize: 18, lineHeight: 24, fontWeight: '600', marginVertical: 6 },
    heading4: { color: theme.colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600', marginVertical: 6 },
    heading5: { color: theme.colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
    heading6: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    s: { textDecorationLine: 'line-through' },
    link: { color: theme.colors.primary },
    code_inline: {
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceVariant,
      fontFamily: 'monospace',
      fontSize: 13,
      borderRadius: 4,
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceVariant,
      borderLeftColor: theme.colors.primary,
      borderLeftWidth: 3,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginVertical: 6,
    },
    hr: { backgroundColor: theme.colors.border, height: 1, marginVertical: 12 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
    table: { borderColor: theme.colors.border, borderWidth: 1, marginVertical: 8 },
  };

  return (
    <Markdown
      rules={rules}
      style={markdownStyles}
      onLinkPress={(url: string) => {
        void Linking.openURL(url);
      }}
    >
      {content}
    </Markdown>
  );
};

const styles = StyleSheet.create({
  codeBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    gap: 6,
  },
  codeLanguage: { textTransform: 'uppercase', fontWeight: '700' },
});
