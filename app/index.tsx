import { Redirect } from 'expo-router';

import { useApp } from '@/hooks/useAppState';

/** Entry point: straight into onboarding until it has been completed once. */
export default function Index() {
  const { onboarded } = useApp();
  return <Redirect href={onboarded ? '/(tabs)/todo' : '/(onboarding)/welcome'} />;
}
