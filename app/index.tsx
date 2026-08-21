import { Redirect } from 'expo-router';

/** Entry point: straight into the app. */
export default function Index() {
  return <Redirect href="/(tabs)/todo" />;
}
