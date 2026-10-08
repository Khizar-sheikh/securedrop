import { Tabs } from 'expo-router';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      initialRouteName="files"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen name="files" options={{ title: 'Files' }} />
      <Tabs.Screen name="shares" options={{ title: 'Shares' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
