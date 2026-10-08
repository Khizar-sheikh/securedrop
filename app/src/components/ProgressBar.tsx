import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

interface ProgressBarProps {
  /** 0–100 */
  progress: number;
}

export const ProgressBar = ({ progress }: ProgressBarProps) => {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      <View
        style={[
          styles.fill,
          { backgroundColor: theme.colors.primary, width: `${clamped}%` },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
