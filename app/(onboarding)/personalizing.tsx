import { Interstitial } from '@/components/Interstitial';

export default function PersonalizingScreen() {
  return (
    <Interstitial
      headline={'Personalizing\n*your* space'}
      weight={700}
      next="/(onboarding)/congrats"
    />
  );
}
