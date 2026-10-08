import { Redirect } from 'expo-router';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../features/auth/AuthProvider';
import { WelcomeScreen } from '../screens/WelcomeScreen';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Redirect href="/files" />;

  return <WelcomeScreen />;
}
