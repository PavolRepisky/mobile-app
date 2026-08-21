import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton, TextLink } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { Pill } from '@/components/Pill';
import { AvatarPlaceholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/constants/theme';
import { PAYWALL_BENEFITS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Plan = 'weekly' | 'yearly';

const PLANS = {
  weekly: { title: 'Weekly', price: '8,99 €', unit: '/week' },
  yearly: { title: 'Yearly', price: '€5.00', unit: '/month' },
} as const;

/**
 * Static paywall — there is no purchase integration, so the CTA simply
 * finishes onboarding and drops into the app.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [plan, setPlan] = useState<Plan>('weekly');

  const start = () => {
    completeOnboarding();
    router.replace('/(tabs)/todo');
  };

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing.xl}>
      <View style={styles.avatars}>
        {['pw-1', 'pw-2', 'pw-3', 'pw-4'].map((seed, i) => (
          <AvatarPlaceholder
            key={seed}
            seed={seed}
            size={72}
            style={i > 0 ? styles.avatarOverlap : undefined}
          />
        ))}
      </View>
      <Pill label="+500,000 joined" style={styles.joined} />

      <Headline size="hero" weight={700} style={styles.headline}>
        {'Join 500,000\n*women* on their\nglow-up *journey*'}
      </Headline>

      <View style={styles.benefits}>
        {PAYWALL_BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons name="checkmark" size={20} color={colors.ink} />
            <Text variant="bodyStrong" style={styles.benefitLabel}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const active = plan === key;
          const info = PLANS[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setPlan(key)}
              style={[styles.plan, active && styles.planActive]}
            >
              {key === 'yearly' ? (
                <Pill label="Save 72%" tone="solid" size="sm" style={styles.save} />
              ) : null}

              <View style={styles.planBody}>
                <View
                  style={[styles.planRadio, active && styles.planRadioActive]}
                >
                  {active ? <View style={styles.planDot} /> : null}
                </View>

                <View style={styles.planText}>
                  <Text
                    variant="sectionTitle"
                    color={active ? colors.ink : colors.inkMuted}
                  >
                    {info.title}
                  </Text>
                  <Text
                    variant="bodyStrong"
                    numberOfLines={1}
                    color={active ? colors.ink : colors.inkMuted}
                    style={styles.planPrice}
                  >
                    {info.price}
                    <Text variant="caption" color={colors.inkMuted}>
                      {info.unit}
                    </Text>
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Continue" onPress={start} style={styles.cta} />

      <View style={styles.secure}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.inkMuted} />
        <Text variant="body" color={colors.inkMuted} style={styles.secureLabel}>
          Secure payments. Cancel anytime.
        </Text>
      </View>

      <View style={styles.legal}>
        <TextLink label="Privacy policy" />
        <TextLink label="Restore" />
        <TextLink label="Terms of service" />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  avatars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  avatarOverlap: {
    marginLeft: -spacing.xl,
  },
  joined: {
    alignSelf: 'center',
    marginTop: -spacing.xl,
  },
  headline: {
    marginTop: spacing.lg,
  },
  benefits: {
    marginTop: spacing['3xl'],
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitLabel: {
    marginLeft: spacing.md,
    flex: 1,
  },
  plans: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['4xl'],
  },
  plan: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.divider,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  planActive: {
    borderColor: colors.ink,
    borderWidth: 2.5,
  },
  planBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioActive: {
    borderColor: colors.ink,
    borderWidth: 2.5,
  },
  planDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ink,
  },
  planText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  /** Kept on one line — "€5.00/month" wraps mid-word otherwise. */
  planPrice: {
    fontSize: 15,
  },
  save: {
    position: 'absolute',
    top: -14,
    right: spacing.md,
    zIndex: 1,
  },
  cta: {
    marginTop: spacing['3xl'],
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  secureLabel: {
    marginLeft: spacing.sm,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
