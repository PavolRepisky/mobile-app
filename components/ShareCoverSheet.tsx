import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Switch, useWindowDimensions, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, shadows } from '@/constants/theme';
import { PrimaryButton } from './Buttons';
import { DayCover, type DayCoverCell } from './DayCover';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** A story's own shape, height over width: the phone's full screen, so the
 * cover fills an Instagram story edge to edge with nothing added round it. */
const STORY_RATIO = 16 / 9;
/** The preview's widest, on a phone tall enough to give it room. */
const PREVIEW_WIDTH = 216;
/** Everything in the popup that isn't the preview — its padding, the title
 * row, the two switches, the save button — plus a margin above and below it.
 * Whatever of the screen is left after this is the preview's to take, so on
 * a short phone the story shrinks rather than the popup running off it. */
const POPUP_CHROME = 340;
/** The smallest the preview goes, still big enough to read the day on. */
const PREVIEW_MIN_HEIGHT = 240;
/** The close button in the popup's corner. */
const CLOSE_SIZE = 36;
/** Quick enough that the dim lands with the popup rather than after it, as
 * `AlertDialog`'s does. */
const SCRIM_FADE_MS = 160;
/** The saved image: a story's full size, so it isn't scaled up on the way
 * into Instagram. */
const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = Math.round(IMAGE_WIDTH * STORY_RATIO);

export interface ShareCoverSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** The day's photos, in its grid's order, each with its time and task. */
  cells: readonly DayCoverCell[];
  day: number;
  totalDays?: number;
  /** The era's name, over the day. */
  kicker: string;
}

/**
 * The day's cover made into a story, in a popup centred over the page: a
 * preview of it at a story's shape, a switch each for the photos' times and their tasks in their middles, and
 * one way out: saved to the phone's photos, ready to post from there.
 */
export function ShareCoverSheet({ visible, onDismiss, cells, day, totalDays, kicker }: ShareCoverSheetProps) {
  const cover = useRef<HostInstance>(null);
  const [times, setTimes] = useState(true);
  const [tasks, setTasks] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const previewHeight = Math.max(
    PREVIEW_MIN_HEIGHT,
    Math.min(PREVIEW_WIDTH * STORY_RATIO, screen.height - insets.top - insets.bottom - POPUP_CHROME),
  );

  // Only the dim behind the popup fades in; the card is there at full
  // strength from the first frame, as with the app's dialogs.
  const scrim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    scrim.setValue(0);
    Animated.timing(scrim, { toValue: 1, duration: SCRIM_FADE_MS, useNativeDriver: true }).start();
  }, [visible, scrim]);

  // Opened fresh: nothing saved yet, nothing gone wrong.
  useEffect(() => {
    if (visible) {
      setSaved(false);
      setProblem(null);
    }
  }, [visible]);
  // A different image now, so it can be saved again.
  useEffect(() => setSaved(false), [times, tasks]);

  /** The preview as a full-size story image, as a file on the phone. */
  const capture = () =>
    captureRef(cover, { format: 'png', width: IMAGE_WIDTH, height: IMAGE_HEIGHT, result: 'tmpfile' });

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      // Photos is the phone's; in the browser the library is only a stand-in
      // (metro.config.js), so say so rather than fail.
      if (Platform.OS === 'web') {
        setProblem('Saving to Photos works in the app on your phone.');
        return;
      }
      // Only to add the image — the app never reads the library from here.
      const access = await MediaLibrary.requestPermissionsAsync(true);
      if (!access.granted) {
        setProblem('Allow Selfera to add photos in Settings to save your day.');
        return;
      }
      await MediaLibrary.Asset.create(await capture());
      setSaved(true);
    } catch {
      setProblem('It didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]} />
        <Pressable accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View style={[styles.panel, shadows.floating]}>
          <View style={styles.header}>
            <Text variant="sectionHeading" style={styles.title}>
              Save your day
            </Text>
            <IconButton
              name="close"
              size={CLOSE_SIZE}
              background={colors.surfaceSunken}
              shadow={false}
              accessibilityLabel="Close"
              onPress={onDismiss}
            />
          </View>

          {/* Lifted and rounded on the card, while what's captured inside is
              square-cornered — a story's corners are the phone's to round. */}
          <View style={[styles.preview, { width: previewHeight / STORY_RATIO, height: previewHeight }, shadows.hard]}>
            <View style={styles.previewClip}>
              <View ref={cover} collapsable={false} style={styles.story}>
                <DayCover
                  cells={cells}
                  day={day}
                  totalDays={totalDays}
                  kicker={kicker}
                  ratio={STORY_RATIO}
                  times={times}
                  tasks={tasks}
                />
              </View>
            </View>
          </View>

          <View style={styles.toggles}>
            <View style={styles.toggle}>
              <Text variant="copy" style={styles.toggleLabel}>
                Time on each photo
              </Text>
              <Switch value={times} onValueChange={setTimes} accessibilityLabel="Time on each photo" />
            </View>
            <View style={styles.toggle}>
              <Text variant="copy" style={styles.toggleLabel}>
                Task on each photo
              </Text>
              <Switch value={tasks} onValueChange={setTasks} accessibilityLabel="Task on each photo" />
            </View>
          </View>

          {problem ? (
            <Text variant="meta" color={colors.destructive} center>
              {problem}
            </Text>
          ) : null}

          <PrimaryButton
            label={saved ? 'Saved to Photos' : 'Save image'}
            icon={saved ? 'checkmark' : 'download-outline'}
            disabled={busy || saved}
            onPress={save}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  scrim: {
    backgroundColor: colors.scrimLight,
  },
  // The app's dialog card: white, the signature corner, floating.
  panel: {
    padding: layout.card,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  title: {
    flex: 1,
  },
  // The story in miniature, lifted off the card like a print — rounded the
  // way a story sits on the phone's screen. Its size follows the screen.
  preview: {
    alignSelf: 'center',
    marginVertical: layout.block,
    borderRadius: radii.md,
  },
  previewClip: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  story: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
  },
  toggles: {
    gap: layout.stack,
    marginBottom: layout.block,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  toggleLabel: {
    flex: 1,
  },
});

export default ShareCoverSheet;
