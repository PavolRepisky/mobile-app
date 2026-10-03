import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, layout, radii, shadows } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, PEOPLE, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Stable per key rather than random, so a row's mutual count doesn't
 * reshuffle on every render — the same trick the profile screen's own fake
 * counts use. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** The friends you share with someone: as many of yours as the stable fake
 * count allows, named up to two, the rest folded into "+ N more". */
function mutualsFor(id: string) {
  const count = fakeCount(id, 1, 4);
  const faces = FRIENDS.slice(0, Math.min(count, 2));
  const names = faces.map((friend) => friend.name).join(', ');
  const more = count - faces.length;
  return { faces, label: more > 0 ? `${names} + ${more} more` : names };
}

/** The same code held up in its sheet: big enough to scan from a phone
 * held across a table, with room left for the title above it. */
const CODE_SHEET_SIZE = 220;
/** A suggestion's face — a step over a post's, since the row is the person. */
const ROW_AVATAR = 52;
/** The mutual friends' faces under a suggestion's handle: small enough to
 * sit on the badge line beside their names. */
const MUTUAL_AVATAR = 18;
/** How far each mutual face tucks under the one before it. */
const MUTUAL_OVERLAP = 8;
/** The white ring that keeps overlapping faces apart. */
const MUTUAL_RING = 2;
/** The invite card's glyph tile and the code glyph in it, off the canvas's
 * board. */
const HERO_TILE = 56;
const HERO_GLYPH = 30;
/** The dismiss cross: quiet beside the Add pill, so it reads as a way out
 * rather than a second action. */
const DISMISS_GLYPH = 16;
/** Suggestions shown before See all opens the rest. */
const SUGGESTION_PEEK = 4;
/** The rule between suggestions — one pixel of the fill grey, as the canvas
 * draws it. */
const ROW_RULE = 1;

/**
 * Finding people to do it with, opened from Community's corner button and
 * laid out the way the canvas's "16 Better · Find friends" board is: a
 * search, a dark invite card that brings someone into your challenge, then
 * suggestions. The card's Share link and its code both carry a link to the
 * challenge's own page, where its Join button is; Share opens the system
 * share sheet, where every messaging app already is.
 *
 * Suggestions read off `FEED_AUTHORS` — people in the same challenge who
 * aren't a friend yet — each with the faces of friends you share, an Add and
 * a cross to set them aside. A search is separate from them: while something
 * is typed, the page is only "Results", matched by name or handle across
 * everyone, friends marked as such. Adding someone sends a request, exactly
 * as the Members feed does: the pill turns to "Request sent" and a second tap
 * takes it back.
 */
export default function AddFriendsScreen() {
  const router = useRouter();
  const { challenge, friendRequests: requested, toggleFriendRequest } = useApp();
  const [query, setQuery] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Set aside for this visit only — nothing remembers a "not now" yet.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));
  const suggestions = FEED_AUTHORS.filter((person) => !dismissed.has(person.id));
  const shownSuggestions = showAll ? suggestions : suggestions.slice(0, SUGGESTION_PEEK);

  // The challenge's own page, where its Join button is — what a scan or a
  // tapped invite opens.
  const joinUrl = Linking.createURL(`feed/${challenge.id}`);
  // The invite goes to the system share sheet, which is where each
  // messaging app actually lives.
  const invite = () =>
    Share.share({
      message: `Join me in ${challenge.name} on Her 75: ${joinUrl}`,
    }).catch(() => {});

  // A search is its own list, not a filter on the suggestions: it looks
  // through everyone — friends included, so a name you already have still
  // turns up — and while it's running the page is only its results.
  const searchTerm = query.trim().toLowerCase().replace(/^@/, '');
  const results = useMemo(
    () =>
      searchTerm
        ? PEOPLE.filter(
            (person) =>
              person.name.toLowerCase().includes(searchTerm) ||
              person.handle.toLowerCase().replace(/^@/, '').includes(searchTerm),
          )
        : [],
    [searchTerm],
  );

  const renderPerson = (person: Friend, index: number, dismissable: boolean) => {
    const isFriend = FRIENDS.some((friend) => friend.id === person.id);
    const isRequested = requested.has(person.id);
    const mutuals = isFriend ? null : mutualsFor(person.id);
    return (
      <View key={person.id} style={[styles.row, index > 0 && styles.rowRuled]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${person.name}'s profile`}
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: person.id } })}
          style={({ pressed }) => [styles.person, pressed && styles.pressed]}
        >
          <Avatar source={person.avatar} size={ROW_AVATAR} />
          <View style={styles.personText}>
            <Text variant="copyBold" numberOfLines={1}>
              {person.name}
            </Text>
            <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
              {person.handle}
            </Text>
            {/* Who you already share, by face — the reason to add someone
                you haven't met on here yet. */}
            {mutuals ? (
              <View style={styles.mutuals}>
                <View style={styles.mutualFaces}>
                  {mutuals.faces.map((friend, i) => (
                    <Avatar
                      key={friend.id}
                      source={friend.avatar}
                      size={MUTUAL_AVATAR + MUTUAL_RING * 2}
                      style={[styles.mutualFace, i > 0 && styles.mutualTucked]}
                    />
                  ))}
                </View>
                <Text variant="badge" color={colors.inkMuted} numberOfLines={1}>
                  {mutuals.label}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        {isFriend ? (
          <Pill tone="muted" size="sm" bold icon="people-outline" label="Friends" />
        ) : (
          // The Members feed's own pill: a request, not a friend yet, so just
          // the words once sent, and a second tap takes it back.
          <Pill
            tone={isRequested ? 'muted' : 'solid'}
            bold
            label={isRequested ? 'Request sent' : 'Add'}
            onPress={() => toggleFriendRequest(person.id)}
          />
        )}
        {dismissable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hide ${person.name}`}
            hitSlop={layout.heading}
            onPress={() => dismiss(person.id)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close" size={DISMISS_GLYPH} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll tone="plain" header={<ScreenHeader plainTitle="Find friends" />}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username"
          style={styles.search}
        />

        {searchTerm ? (
          <>
            <View style={styles.sectionHeading}>
              <Text variant="sectionHeading">Results</Text>
              <Text variant="metaBold" color={colors.inkMuted}>
                {String(results.length)}
              </Text>
            </View>
            {results.length ? (
              <View>{results.map((person, i) => renderPerson(person, i, false))}</View>
            ) : (
              <EmptyState
                icon="search-outline"
                disc
                title="No one by that name"
                hint="Try a username or another spelling."
              />
            )}
          </>
        ) : (
          <>
            {/* The invite, the page's one dark block: the way to bring
                someone who isn't on the app yet, so it leads ahead of the
                suggestions. Share link goes out through the system sheet;
                Show code holds the code up for a friend standing next to
                you. */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroTile}>
                  <Ionicons name="qr-code-outline" size={HERO_GLYPH} color={colors.ink} />
                </View>
                <View style={styles.heroText}>
                  <Text variant="itemTitle" color={colors.inkInverse}>
                    Bring a friend along
                  </Text>
                  <Text variant="meta" color={colors.inkGhost}>
                    {`They join ${challenge.name} with you`}
                  </Text>
                </View>
              </View>
              <View style={styles.heroActions}>
                <View style={styles.heroAction}>
                  <Pill
                    tone="floating"
                    bold
                    icon="link-outline"
                    label="Share link"
                    onPress={invite}
                    style={styles.heroPill}
                  />
                </View>
                <View style={styles.heroAction}>
                  <Pill
                    tone="onInk"
                    bold
                    icon="qr-code-outline"
                    label="Show code"
                    onPress={() => setCodeOpen(true)}
                    style={styles.heroPill}
                  />
                </View>
              </View>
            </View>

            {suggestions.length ? (
              <>
                <View style={styles.sectionHeading}>
                  <Text variant="sectionHeading">Suggested for you</Text>
                  {suggestions.length > SUGGESTION_PEEK && !showAll ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={layout.stack}
                      onPress={() => setShowAll(true)}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Text variant="metaBold" color={colors.inkMuted}>
                        See all
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <View>
                  {shownSuggestions.map((person, i) => renderPerson(person, i, true))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScreenScroll>

      {/* The code at full size slides up from the bottom the way the
          comments do: something to hold out to a friend for a moment, and
          swiped or tapped away once they've scanned it. */}
      {/* No gap past the safe area: the text is the sheet's last word, and
          the default room left for a button under it read as empty space. */}
      <BottomSheet visible={codeOpen} onDismiss={() => setCodeOpen(false)} bottomGap={0}>
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
            <Text variant="itemTitle" center>
              {challenge.name}
            </Text>
            <Text variant="copy" color={colors.inkMuted} center>
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
  search: {
    marginBottom: layout.section,
  },
  // The invite card: ink rather than the fill grey, the one dark block on
  // the page, on the signature corner.
  hero: {
    marginBottom: layout.section,
    padding: layout.card,
    gap: layout.block,
    borderRadius: radii.card,
    backgroundColor: colors.ink,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
  },
  heroTile: {
    width: HERO_TILE,
    height: HERO_TILE,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: layout.line,
  },
  heroActions: {
    flexDirection: 'row',
    gap: layout.stack,
  },
  heroAction: {
    flex: 1,
  },
  // The two buttons share the card's width equally rather than hugging
  // their labels.
  heroPill: {
    alignSelf: 'stretch',
  },
  codeSheet: {
    alignItems: 'center',
    gap: layout.block,
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
  // A heading with its quiet count or See all at the far end — Community's
  // "Finished today".
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.heading,
  },
  rowRuled: {
    borderTopWidth: ROW_RULE,
    borderTopColor: colors.surfaceSunken,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  personText: {
    flex: 1,
  },
  mutuals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.pill,
    marginTop: layout.line,
  },
  mutualFaces: {
    flexDirection: 'row',
  },
  // The ring is the page's own white drawn as a border, so a face tucked
  // under the next one still reads as its own circle.
  mutualFace: {
    borderWidth: MUTUAL_RING,
    borderColor: colors.surface,
  },
  mutualTucked: {
    marginLeft: -MUTUAL_OVERLAP,
  },
  pressed: {
    opacity: 0.7,
  },
});
