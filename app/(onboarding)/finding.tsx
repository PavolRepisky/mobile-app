import { Interstitial } from '@/components/Interstitial';

export default function FindingScreen() {
  return (
    <Interstitial
      headline={'Finding **your**\n*perfect* challenge'}
      weight={700}
      next="/(onboarding)/select-challenge"
    />
  );
}
