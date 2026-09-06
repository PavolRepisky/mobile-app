import { Image } from 'expo-image';
// SDK 57 promoted the class-based query API to the package root. This sheet
// wants the flat one — an `Asset` that is a plain object, so `'uri' in item`
// still tells a photo apart from a collection tile — which now lives here.
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { colors, spacing } from '@/constants/theme';
import { WALL_COLLECTIONS, type WallItem } from '@/data/content';
import type { TaskPhoto } from '@/hooks/useAppState';

type Source = 'photos' | 'collections';

/** Tiles per row, and the hairline between them. */
const COLUMNS = 3;
const GAP = 2;
/** Assets fetched per page. Enough to fill a few screens before the next one. */
const PAGE = 90;
/** Share of the screen the sheet rises to. */
const HEIGHT_RATIO = 0.9;

/** Only the collection entries that actually carry a photo — the rest render
 * as seeded stand-ins on the wall, and there is nothing there to attach. */
const COLLECTION_ITEMS = WALL_COLLECTIONS.flatMap(
  (collection) => collection.items,
).filter((item): item is WallItem & { photo: TaskPhoto } => !!item.photo);

export interface PhotoLibrarySheetProps {
  visible: boolean;
  /** Handed the picked photo. */
  onPick: (photo: TaskPhoto) => void;
  onDismiss: () => void;
  /** Fired once the sheet is gone, for callers that navigate on from here. */
  onDismissed?: () => void;
}

/**
 * Photo picker: the phone's library, or the photos already pinned to the wall
 * collections. The second tab is what makes this worth building over the
 * system sheet — most of what gets picked is something already saved to the
 * app.
 *
 * A sheet rather than a page of its own: it is opened mid-flow and whatever it
 * is picking for should stay visible behind it. Note that a task's proof photo
 * does *not* come from here — those have to be taken on the spot.
 */
export function PhotoLibrarySheet({
  visible,
  onPick,
  onDismiss,
  onDismissed,
}: PhotoLibrarySheetProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const [source, setSource] = useState<Source>('photos');
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [exhausted, setExhausted] = useState(false);

  // All three are refs rather than state on purpose: the permission hook hands
  // back a fresh object on every render, so anything that both reads it and
  // sets state would ask for access again on the render its own answer caused.
  const asked = useRef(false);
  const started = useRef(false);
  const inFlight = useRef(false);

  const granted = permission?.granted || permission?.accessPrivileges === 'limited';

  const loadPage = useCallback(async (after?: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setAssets((prev) => (after ? [...prev, ...page.assets] : page.assets));
      setCursor(page.endCursor);
      setExhausted(!page.hasNextPage);
    } catch {
      // No library on this platform, or the permission was pulled from under
      // us: fall back to the empty state rather than a crash.
      setExhausted(true);
    }
    inFlight.current = false;
  }, []);

  // Both effects wait on `visible`. The sheet lives in its screen's tree from
  // the moment it mounts, and asking for the photo library the first time the
  // app opens — rather than the first time someone picks a photo — is the one
  // thing that would make it feel like it is taking something.
  useEffect(() => {
    if (!visible || !permission || granted || asked.current) return;
    if (!permission.canAskAgain) return;
    asked.current = true;
    requestPermission();
  }, [visible, permission, granted, requestPermission]);

  useEffect(() => {
    if (!visible || !granted || started.current) return;
    started.current = true;
    loadPage();
  }, [visible, granted, loadPage]);

  const choose = (photo: TaskPhoto) => {
    onPick(photo);
    onDismiss();
  };

  const photos = source === 'photos';
  const data: readonly (MediaLibrary.Asset | (typeof COLLECTION_ITEMS)[number])[] =
    photos ? assets : COLLECTION_ITEMS;

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      onDismissed={onDismissed}
      // The close button is the grabber here: two round things stacked at
      // the top edge read as clutter.
      handle={false}
      padded={false}
      style={{ height: Math.round(height * HEIGHT_RATIO) }}
    >
      <View style={styles.header}>
        <IconButton
          name="close"
          onPress={onDismiss}
          accessibilityLabel="Close"
          background={colors.surface}
        />
        <SegmentedTabs
          variant="pill"
          options={[
            { key: 'photos', label: 'Photos' },
            { key: 'collections', label: 'Collections' },
          ]}
          value={source}
          onChange={setSource}
          style={styles.tabs}
        />
      </View>

      <FlatList
        data={data}
        style={styles.grid}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (photos && granted && !exhausted) loadPage(cursor);
        }}
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title={granted ? 'No photos yet' : 'No library access'}
            hint={
              granted
                ? 'Photos you take will show up here.'
                : 'Allow photo access in Settings to pick from your library, or use a collection photo instead.'
            }
          />
        }
        renderItem={({ item }) => {
          const isAsset = 'uri' in item;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isAsset ? 'Photo' : item.title}
              onPress={() => choose(isAsset ? { uri: item.uri } : item.photo)}
              style={({ pressed }) => [
                { width: tile, height: tile },
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={isAsset ? { uri: item.uri } : item.photo}
                contentFit="cover"
                transition={120}
                style={StyleSheet.absoluteFill}
              />
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  /** Takes the rest of the row, so the track ends flush with the right edge. */
  tabs: {
    flex: 1,
  },
  /** Takes the height the header leaves, so the grid scrolls inside the
   * sheet rather than running off the bottom of it. */
  grid: {
    flex: 1,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default PhotoLibrarySheet;
