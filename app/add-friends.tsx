import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import {
  profileActionButton,
  profileActionIcon,
  profileActionTop,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, layout, radii, shadows } from '@/constants/theme';
import { FEED_AUTHORS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Stable per key rather than random, so a row's mutual count doesn't
 * reshuffle on every render — the same trick the profile screen's own fake
 * counts use. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** The friend code in its card: big enough to scan off a phone held out,
 * small enough to sit beside its title rather than above it. */
const CODE_SIZE = 78;
/** The same code held up in its sheet: big enough to scan from a phone
 * held across a table, with room left for the title above it. */
const CODE_SHEET_SIZE = 220;
/** A suggestion's face — a step over a post's, since the row is the person. */
const ROW_AVATAR = 48;

/**
 * Finding people to do it with, opened from Community's corner button and
 * laid out the way the canvas's "Find friends" board is: a search, a code
 * that invites someone into your challenge, then suggestions. The code and
 * the card's Share both carry a link to the challenge's own page, where its
 * Join button is; Share opens the system share sheet, where every messaging
 * app already is.
 *
 * Built on My Profile and Settings' own parts — the pinned round back button
 * on the title's line, the fill-grey card, the type levels and `layout`
 * spacing. Suggestions read off `FEED_AUTHORS` — people in the same
 * challenge who aren't a friend yet — and the search filters them by name or
 * handle. Adding one sends a request, exactly as the Members feed does: the
 * pill turns to "Request sent" and a second tap takes it back.
 */
export default function AddFriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge } = useApp();
  const [query, setQuery] = useState('');
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const [codeOpen, setCodeOpen] = useState(false);

  // The title and the pinned back button share one line — Settings' own.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // The challenge's own page, where its Join button is — what a scan or a
  // tapped invite opens.
  const joinUrl = Linking.createURL(`feed/${challenge.id}`);
  // The invite goes to the system share sheet, which is where each
  // messaging app actually lives.
  const invite = () =>
    Share.share({
      message: `Join me in ${challenge.name} on Her 75: ${joinUrl}`,
    }).catch(() => {});

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return FEED_AUTHORS;
    return FEED_AUTHORS.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        person.handle.toLowerCase().replace(/^@/, '').includes(q),
    );
  }, [query]);

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll tone="plain">
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="pageTitle" center>
            Find friends
          </Text>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username or name"
          style={styles.search}
        />

        {/* Your challenge's code, for a friend standing next to you — My
            Profile's challenge card, the same grey and corner. */}
        <Card flat padded={false} radius={radii.md} style={styles.codeCard}>
          <View style={styles.codeBody}>
            {/* Small here to sit beside its title; a tap holds it up big
                enough to scan from across a table. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show the code to join my challenge"
              onPress={() => setCodeOpen(true)}
              style={({ pressed }) => [styles.codeTile, pressed && styles.pressed]}
            >
              <QRCode
                value={joinUrl}
                size={CODE_SIZE}
                color={colors.ink}
                backgroundColor={colors.surface}
              />
            </Pressable>
            <View style={styles.codeText}>
              <View style={styles.codeLines}>
                <Text variant="itemTitle">Invite to your challenge</Text>
                <Text variant="meta" color={colors.inkMuted}>
                  {`Friends scan it to join ${challenge.name}.`}
                </Text>
              </View>
              <Pill tone="solid" icon="share-outline" label="Share" bold onPress={invite} />
            </View>
          </View>
        </Card>

        <Text variant="sectionHeading" style={styles.heading}>
          Suggested for you
        </Text>

        {suggestions.length ? (
          <View style={styles.list}>
            {suggestions.map((person) => {
              const mutual = fakeCount(person.id, 1, 4);
              const isRequested = requested.has(person.id);
              return (
                <View key={person.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${person.name}'s profile`}
                    onPress={() =>
                      router.push({ pathname: '/friend/[id]', params: { id: person.id } })
                    }
                    style={({ pressed }) => [styles.person, pressed && styles.pressed]}
                  >
                    <Avatar source={person.avatar} size={ROW_AVATAR} />
                    <View style={styles.personText}>
                      <Text variant="copyBold" numberOfLines={1}>
                        {person.name}
                      </Text>
                      <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
                        {`${person.handle} · ${mutual} mutual`}
                      </Text>
                    </View>
                  </Pressable>
                  {/* The Members feed's own pill: a request, not a friend yet,
                      so a clock rather than a check, and a second tap takes it
                      back. */}
                  <Pill
                    tone={isRequested ? 'muted' : 'solid'}
                    size="sm"
                    bold
                    icon={isRequested ? 'time-outline' : 'person-add'}
                    label={isRequested ? 'Request sent' : 'Add'}
                    onPress={() =>
                      setRequested((prev) => {
                        const next = new Set(prev);
                        if (isRequested) next.delete(person.id);
                        else next.add(person.id);
                        return next;
                      })
                    }
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="search-outline"
            title="No one by that name"
            hint="Try a username or another spelling."
          />
        )}
      </ScreenScroll>

      {/* Settings' back button — the round corner button pinned on the
          title's line, so the way out stays in reach however far down the
          page goes. */}
      <IconButton
        name="chevron-back"
        size={profileActionButton}
        iconSize={profileActionIcon}
        background={colors.surface}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.cornerLeft, { top: headerTop }]}
      />

      {/* The code at full size slides up from the bottom the way the
          comments do: something to hold out to a friend for a moment, and
          swiped or tapped away once they've scanned it. */}
      <BottomSheet visible={codeOpen} onDismiss={() => setCodeOpen(false)}>
        <View style={styles.codeSheet}>
          <Text variant="sectionHeading" center>
            Join my challenge
          </Text>
          <View style={styles.codeSheetTile}>
            <QRCode
              value={joinUrl}
              size={CODE_SHEET_SIZE}
              color={colors.ink}
              backgroundColor={colors.surface}
            />
          </View>
          {/* Which challenge it joins, and what to do with it — written to
              the friend holding the camera, since the sheet is held out to
              them. */}
          <View style={styles.codeSheetText}>
            <Text variant="copyBold" center>
              {challenge.name}
            </Text>
            <Text variant="meta" color={colors.inkMuted} center>
              Scan with your phone's camera to join me.
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  // The pinned button's height, so the title centres on the same line.
  header: {
    minHeight: profileActionButton,
    justifyContent: 'center',
    marginBottom: layout.title,
  },
  cornerLeft: {
    position: 'absolute',
    left: layout.gutter,
  },
  search: {
    marginBottom: layout.section,
  },
  codeCard: {
    marginBottom: layout.section,
    backgroundColor: colors.surfaceSunken,
  },
  codeBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
    padding: layout.card,
  },
  // A white square under the code with a quiet margin round it — a scanner
  // needs the code on flat white, as the profile's own code sheet sets it.
  codeTile: {
    padding: layout.stack,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  codeSheet: {
    alignItems: 'center',
    gap: layout.block,
    paddingBottom: layout.block,
  },
  // Lifted off the sheet on the card shadow, with a quiet white margin round
  // the code for the scanner.
  codeSheetTile: {
    padding: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  codeSheetText: {
    alignItems: 'center',
    gap: layout.line,
    paddingHorizontal: layout.card,
  },
  codeText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: layout.heading,
  },
  codeLines: {
    gap: layout.line,
  },
  heading: {
    marginBottom: layout.heading,
  },
  list: {
    gap: layout.block,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  personText: {
    flex: 1,
    gap: layout.line,
  },
  pressed: {
    opacity: 0.7,
  },
});
