import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    profile,
    totalDays,
    paused,
    setPaused,
    setName,
    resetAll,
  } = useApp();

  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tone="alt" tabBar>
        <ScreenHeader plainTitle="Settings" />

        <Group title="Profile">
          <Row
            label="Your name"
            value={profile.name}
            onPress={() => {
              setDraftName(profile.name);
              setNameOpen(true);
            }}
          />
          <Row
            label="Bio"
            value={profile.bio ?? 'Add a bio'}
            onPress={() => router.push('/account/bio')}
            last
          />
        </Group>

        <Group title="Challenge">
          <Row label="Duration" value={`${totalDays} days`} onPress={() => {}} />
          <View style={styles.row}>
            <Text variant="cardTitle" style={styles.rowLabel}>
              Pause challenge
            </Text>
            <Switch
              value={paused}
              onValueChange={setPaused}
              trackColor={{ false: colors.field, true: colors.ink }}
              thumbColor={colors.surface}
            />
          </View>
        </Group>

        <Group title="Legal">
          <Row label="Privacy Policy" onPress={() => {}} />
          <Row label="Terms of Service" onPress={() => {}} last />
        </Group>

        <Group title="Account">
          <Row
            label="Delete account"
            destructive
            icon="trash-outline"
            onPress={resetAll}
          />
          <Row
            label="Log out"
            destructive
            icon="log-out-outline"
            onPress={resetAll}
            last
          />
        </Group>
      </ScreenScroll>

      <AlertDialog
        visible={nameOpen}
        title="Update Username"
        message="Enter your new username"
        onDismiss={() => setNameOpen(false)}
        input={{
          value: draftName,
          onChangeText: setDraftName,
          autoFocus: true,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setNameOpen(false) },
          {
            label: 'Update',
            onPress: () => {
              if (draftName.trim()) setName(draftName.trim());
              setNameOpen(false);
            },
          },
        ]}
      />
    </View>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="label" color={colors.inkMuted} style={styles.groupTitle}>
        {title}
      </Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  destructive,
  icon,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && styles.pressed,
      ]}
    >
      <Text
        variant="cardTitle"
        color={destructive ? colors.destructive : colors.ink}
        style={styles.rowLabel}
      >
        {label}
      </Text>

      {value ? (
        <Text variant="body" color={colors.inkMuted} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}

      <Ionicons
        name={icon ?? 'chevron-forward'}
        size={20}
        color={destructive ? colors.destructive : colors.inkMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  group: {
    marginBottom: spacing['2xl'],
  },
  groupTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
