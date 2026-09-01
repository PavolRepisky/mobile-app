import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { colors, spacing, type as typeScale } from '@/constants/theme';
import { PhotoSlot } from './PhotoSlot';
import { PopoverMenu } from './PopoverMenu';
import { Text } from './Text';

/**
 * What a tile needs to draw itself. Both the pins on your own wall and the
 * items on someone else's satisfy this; neither is narrowed to the other.
 */
export interface WallTile {
  id: string;
  title: string;
  photo?: ImageSourcePropType;
  seed?: string;
}

export interface WallSectionProps {
  title: string;
  /** What is pinned to this collection. An empty one renders nothing. */
  items?: readonly WallTile[];
  /** Own wall: shows the trailing "+" tile so the collection can be filled. */
  editable?: boolean;
  onPressItem?: (item: WallTile) => void;
  /** Commits a new name for the collection. Editing is offered only with it. */
  onRename?: (title: string) => void;
  /** Chosen from the "+" menu: hands off to the photo library. */
  onAddPhoto?: () => void;
}

const TILE = { width: 124, height: 172 } as const;

/**
 * A ScrollView clips to its bounds, and a tile's hard drop reaches past all
 * four of its own edges — 8px of blur, thrown 4px down. The row is padded by
 * this much and pulled back by the same amount, so the shadow has somewhere to
 * land and the tiles stay exactly where they were.
 */
const GUTTER = spacing.md;

/**
 * One collection on the profile wall — a heading over a horizontal row of
 * tiles. On your own wall the row ends in an empty "+" slot; on someone
 * else's there is nothing to add, so a collection they haven't filled is left
 * off the screen entirely rather than shown empty.
 *
 * The "+" does not go straight to the photo library: a collection is a name as
 * well as a set of pins, so it opens a menu over the tile offering both.
 */
export function WallSection({
  title,
  items = [],
  editable = false,
  onPressItem,
  onRename,
  onAddPhoto,
}: WallSectionProps) {
  const addTile = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Kept past the menu's own dismissal: it stays mounted for the length of the
  // collapse, and an anchor reset to zero would fling it into the corner on
  // the way out.
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  if (items.length === 0 && !editable) return null;

  const openMenu = () => {
    // Measured rather than derived: the row scrolls, so where the "+" sits in
    // the window is not something the section can work out for itself.
    addTile.current?.measureInWindow((x, y) => {
      setAnchor({ top: Math.round(y + TILE.height / 4), left: Math.round(x + spacing.md) });
      setMenuOpen(true);
    });
  };

  const commitName = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== title) onRename?.(next);
    else setDraft(title);
  };

  return (
    <View style={styles.section}>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commitName}
          onSubmitEditing={commitName}
          autoFocus
          returnKeyType="done"
          selectTextOnFocus
          style={[typeScale.sectionTitle, styles.title, styles.input]}
        />
      ) : (
        <Text variant="sectionTitle" style={styles.title}>
          {title}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <PhotoSlot
            key={item.id}
            photo={item.photo}
            seed={item.seed ?? item.id}
            {...TILE}
            shadow={false}
            onPress={onPressItem ? () => onPressItem(item) : undefined}
          />
        ))}

        {editable ? (
          <View ref={addTile} collapsable={false}>
            <PhotoSlot
              seed={null}
              {...TILE}
              emptyIcon="add"
              shadow="hard"
              onPress={openMenu}
            />
          </View>
        ) : null}
      </ScrollView>

      <PopoverMenu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        top={anchor.top}
        left={anchor.left}
        items={[
          {
            label: 'Edit Name',
            onPress: () => {
              setDraft(title);
              setEditing(true);
            },
          },
          { label: 'Add Photo', onPress: () => onAddPhoto?.() },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['4xl'],
  },
  title: {
    marginBottom: spacing.lg,
  },
  // The field has to sit exactly where the heading was, so it carries no
  // decoration of its own: the cursor is the only thing that marks it.
  input: {
    color: colors.ink,
    padding: 0,
  },
  scroll: {
    marginTop: -GUTTER,
    marginBottom: -GUTTER,
    marginLeft: -GUTTER,
  },
  row: {
    gap: spacing.md,
    paddingTop: GUTTER,
    paddingBottom: GUTTER,
    paddingLeft: GUTTER,
    // The trailing edge is scroll-end room rather than a gutter, and is wider
    // than one either way.
    paddingRight: spacing.xl,
  },
});

export default WallSection;
