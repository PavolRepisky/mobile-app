import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/** The profile screen's own settings glyph, sized on its own rather than a
 * circular button. */
const backIconSize = 26;
/** The outline glyph has no bold cut of its own — stacking a second copy a
 * hair off the first thickens the stroke without switching to the filled
 * icon. Matches the profile screen's settings glyph exactly. */
const backBoldOffset = 0.6;

const BIO_MAX = 120;

/** The photo row's thumbnail — a row-height glance at the current photo, not
 * a second hero circle. */
const PHOTO_THUMB = 32;

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, setName, setBio, setHandle, setAvatarPhoto, setAvatarSeed, resetAll } =
    useApp();

  // Changing the photo lives here rather than on the profile, where a tap on
  // the photo plays today's story instead. With a photo set, the row opens it
  // full-screen with Edit and Remove; without one it goes straight to the
  // library. Edit opens the library once the viewer is gone — on iOS a sheet
  // presented over a modal that is still fading out never shows.
  const avatarSource = profile.avatar ?? profile.avatarSeed;
  const hasAvatar = Boolean(avatarSource);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryAfterViewer = useRef(false);

  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [handleOpen, setHandleOpen] = useState(false);
  const [draftHandle, setDraftHandle] = useState(profile.handle);
  const [bioOpen, setBioOpen] = useState(false);
  const [draftBio, setDraftBio] = useState(profile.bio ?? '');
  // Both account rows are one tap from wiping everything, so each one asks
  // first. Separate flags rather than one union: the dialog fades out, and a
  // shared value would swap the copy mid-animation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={styles.screenRoot}>
      {/* The one screen off the white: its groups are white cards, and on a
          white page they'd dissolve into it. The cooler off-white is what
          lets each group read as its own card. */}
      <ScreenScroll tone="alt" tabBar>
        {/* The profile screen's own header row exactly: a spacer balancing
            the leading glyph so the title centres on the page, rather than
            a fixed band with a button floating over the scroll content. */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={spacing.md}
            style={({ pressed }) => pressed && styles.iconPressed}
          >
            <View style={styles.backIconStack}>
              <Ionicons name="chevron-back" size={backIconSize} color={colors.ink} />
              <Ionicons
                name="chevron-back"
                size={backIconSize}
                color={colors.ink}
                style={styles.backIconOverlay}
              />
            </View>
          </Pressable>

          <Text variant="sectionTitle" center style={styles.headerTitle}>
            Settings
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <Group title="Profile">
          <Row
            label="Profile photo"
            accessory={<Avatar source={avatarSource} size={PHOTO_THUMB} />}
            onPress={() => (hasAvatar ? setPhotoOpen(true) : setLibraryOpen(true))}
          />
          <Row
            label="Your name"
            value={profile.name}
            onPress={() => {
              setDraftName(profile.name);
              setNameOpen(true);
            }}
          />
          <Row
            label="Username"
            value={profile.handle}
            onPress={() => {
              setDraftHandle(profile.handle);
              setHandleOpen(true);
            }}
          />
          <Row
            label="Bio"
            value={profile.bio ?? 'Add a bio'}
            onPress={() => {
              setDraftBio(profile.bio ?? '');
              setBioOpen(true);
            }}
            last
          />
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
            onPress={() => setDeleteOpen(true)}
          />
          <Row
            label="Log out"
            destructive
            icon="log-out-outline"
            onPress={() => setLogoutOpen(true)}
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

      <AlertDialog
        visible={handleOpen}
        title="Update Username"
        message="Enter your new username"
        onDismiss={() => setHandleOpen(false)}
        input={{
          value: draftHandle,
          onChangeText: setDraftHandle,
          autoFocus: true,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setHandleOpen(false) },
          {
            label: 'Update',
            onPress: () => {
              const next = draftHandle.trim();
              if (next) setHandle(next.startsWith('@') ? next : `@${next}`);
              setHandleOpen(false);
            },
          },
        ]}
      />

      <AlertDialog
        visible={bioOpen}
        title="Update Bio"
        message="Tell friends a little about yourself"
        onDismiss={() => setBioOpen(false)}
        input={{
          value: draftBio,
          // A bio is a line or two, not a page: a run of line breaks (typed
          // or pasted in) would stretch the identity block on the profile
          // page well past the avatar next to it, so breaks collapse to a
          // space as they're typed rather than surviving to render.
          onChangeText: (next) =>
            setDraftBio(next.replace(/\s*\n+\s*/g, ' ').slice(0, BIO_MAX)),
          autoFocus: true,
          multiline: true,
          maxLength: BIO_MAX,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setBioOpen(false) },
          {
            label: 'Update',
            onPress: () => {
              setBio(draftBio.trim() ? draftBio.trim() : null);
              setBioOpen(false);
            },
          },
        ]}
      />

      <AlertDialog
        visible={deleteOpen}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action is irreversible."
        onDismiss={() => setDeleteOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setDeleteOpen(false) },
          {
            label: 'Delete',
            destructive: true,
            onPress: () => {
              setDeleteOpen(false);
              resetAll();
            },
          },
        ]}
      />

      <AlertDialog
        visible={logoutOpen}
        title="Log out"
        message="Are you sure you want to log out?"
        onDismiss={() => setLogoutOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setLogoutOpen(false) },
          {
            label: 'Log out',
            destructive: true,
            onPress: () => {
              setLogoutOpen(false);
              resetAll();
            },
          },
        ]}
      />

      <PhotoViewer
        photos={avatarSource ? [avatarSource] : []}
        index={photoOpen ? 0 : null}
        onDismiss={() => setPhotoOpen(false)}
        onDismissed={() => {
          if (!libraryAfterViewer.current) return;
          libraryAfterViewer.current = false;
          setLibraryOpen(true);
        }}
        actions={[
          {
            key: 'edit',
            label: 'Edit',
            icon: 'pencil',
            onPress: () => {
              setPhotoOpen(false);
              // iOS waits for the viewer to finish fading; nowhere else
              // loses a sheet presented straight away.
              if (Platform.OS === 'ios') libraryAfterViewer.current = true;
              else setLibraryOpen(true);
            },
          },
          {
            key: 'remove',
            label: 'Remove',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              setAvatarPhoto(null);
              setAvatarSeed(null);
              setPhotoOpen(false);
            },
          },
        ]}
      />

      <PhotoLibrarySheet
        visible={libraryOpen}
        onPick={setAvatarPhoto}
        onDismiss={() => setLibraryOpen(false)}
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
  accessory,
  onPress,
  destructive,
  icon,
  last,
}: {
  label: string;
  value?: string;
  /** Drawn where the value text would sit — the photo row's thumbnail. */
  accessory?: React.ReactNode;
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
        <Text variant="bodySemi" color={colors.inkMuted} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}

      {accessory ? <View style={styles.rowValue}>{accessory}</View> : null}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    flex: 1,
  },
  backIconStack: {
    width: backIconSize + backBoldOffset,
    height: backIconSize + backBoldOffset,
  },
  backIconOverlay: {
    position: 'absolute',
    left: backBoldOffset,
    top: backBoldOffset,
  },
  // Balances the leading glyph, so the flexed title between them centres on
  // the page instead of on the leftover space.
  headerSpacer: {
    width: backIconSize + backBoldOffset,
  },
  iconPressed: {
    opacity: 0.85,
  },
  group: {
    marginBottom: spacing['2xl'],
  },
  groupTitle: {
    // The group headings carry the structure of the screen, so they run in the
    // heavy cut rather than the label default.
    fontFamily: fonts.bodyBold,
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
