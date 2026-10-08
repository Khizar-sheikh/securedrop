export interface Palette {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  success: string;
  warning: string;
  danger: string;
  dangerSurface: string;
}

const light: Palette = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF1F5',
  border: '#DDE2EA',
  text: '#0E1420',
  textMuted: '#5C6675',
  primary: '#2C5CE6',
  primaryText: '#FFFFFF',
  success: '#12855F',
  warning: '#9A6700',
  danger: '#C62828',
  dangerSurface: '#FDECEC',
};

const dark: Palette = {
  background: '#0B0F16',
  surface: '#141A24',
  surfaceVariant: '#1C2431',
  border: '#27303E',
  text: '#E9EDF5',
  textMuted: '#97A2B3',
  primary: '#5B85FF',
  primaryText: '#08111F',
  success: '#39C79A',
  warning: '#E0A73B',
  danger: '#FF6B6B',
  dangerSurface: '#2A1717',
};

export const palettes = { light, dark };

export type ThemeMode = keyof typeof palettes;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  mono: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
} as const;

export interface AppTheme {
  mode: ThemeMode;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export const buildTheme = (mode: ThemeMode): AppTheme => ({
  mode,
  colors: palettes[mode],
  spacing,
  radius,
  typography,
});
