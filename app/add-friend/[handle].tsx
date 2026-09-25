import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/Buttons';
import { EmptyState } from '@/components/EmptyState';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/constants/theme';
import { FRIENDS, PEOPLE } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Big enough to recognise the face you just scanned, well under the profile
 * hero circle — this is a confirmation, not their profile. */
const avatarSize = 96;

/** Handles are stored with their "@"; the link carries them without it. */
const bare = (handle: string) => handle.replace(/^@/, '');

/**
 * Where a scanned friend code lands: `her75://add-friend/<handle>`, the link
 * the QR on the back of someone's profile photo holds. It shows who the code
 * belongs to and one button to add them. There is no backend behind the
 * roster, so the handle is matched against the app's own people, and adding
 * is held on this screen the way the Add Friends list holds its own.
 */
export default function AddFriendScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { profile } = useApp();
  const [added, setAdded] = useState(false);

  const code = bare(String(handle ?? ''));
  const person = PEOPLE.find((p) => bare(p.handle) === code);
  const isYou = code === bare(profile.handle);
  const alreadyFriends = person ? FRIENDS.some((f) => f.id === person.id) : false;

  return (
    <ScreenScroll>
      <ScreenHeader plainTitle="Add Friend" />

      {isYou ? (
        <EmptyState
          icon="qr-code-outline"
          title="That's your own code"
          hint="Show it to a friend so they can add you."
        />
      ) : !person ? (
        <EmptyState
          icon="qr-code-outline"
          title="No one found"
          hint="This code doesn't match anyone in the app."
        />
      ) : (
        <View style={styles.body}>
          <Avatar source={person.avatar} size={avatarSize} />
          <Text variant="sectionTitle" center style={styles.name}>
            {person.name}
          </Text>
          <Text variant="bodyBold" color={colors.inkMuted} center>
            {person.handle}
          </Text>
          {person.bio ? (
            <Text variant="bodyBold" color={colors.inkMuted} center style={styles.bio}>
              {person.bio}
            </Text>
          ) : null}

          <PrimaryButton
            label={alreadyFriends ? 'Already friends' : added ? 'Added' : 'Add friend'}
            icon={alreadyFriends || added ? 'checkmark' : 'person-add'}
            disabled={alreadyFriends || added}
            onPress={() => setAdded(true)}
            fullWidth
            style={styles.button}
          />
        </View>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  name: {
    marginTop: spacing.lg,
  },
  bio: {
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing['3xl'],
  },
});
