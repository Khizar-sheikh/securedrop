declare module 'react-native-markdown-display' {
  import type { ComponentType, ReactNode } from 'react';
  import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

  export interface MarkdownNode {
    key: string;
    type: string;
    sourceType?: string;
    sourceInfo?: string;
    content: string;
    children: MarkdownNode[];
    attributes: Record<string, string>;
    block?: boolean;
    markup?: string;
  }

  export type MarkdownRule = (
    node: MarkdownNode,
    children: ReactNode,
    parent: MarkdownNode | null,
    styles: Record<string, StyleProp<TextStyle | ViewStyle>>,
    inheritedStyles?: StyleProp<TextStyle>,
  ) => ReactNode;

  export interface MarkdownProps {
    children: string;
    style?: Record<string, StyleProp<TextStyle | ViewStyle>>;
    mergeStyle?: boolean;
    rules?: Record<string, MarkdownRule>;
    onLinkPress?: (url: string) => void;
  }

  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}
