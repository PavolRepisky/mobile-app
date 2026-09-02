import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  CHALLENGES,
  CUSTOM_CHALLENGE,
  challengeById,
  nextTint,
  tinted,
  type Challenge,
  type ChallengeTask,
} from '@/data/challenges';
import { FEED_POSTS, WALL_COLLECTIONS, WALL_SECTIONS } from '@/data/content';
import { addDays, timeStamp } from '@/lib/format';
import type { ImageSourcePropType } from 'react-native';

/**
 * All app state lives here, in memory. There is no backend — the provider is
 * seeded so the app opens on Day 5 of Her 75 with a few days of history, which
 * is the state the reference screenshots were taken in.
 */

export interface TaskProgress {
  done: boolean;
  /** Formatted completion stamp, e.g. "7:19am". */
  time?: string;
  /** Seed for the proof photo, or null if none was attached. */
  photoSeed?: string | null;
  /**
   * A real photo the user took or picked. Bundled collection photos come
   * through as a `require`d module rather than a path, so this holds either.
   */
  photo?: TaskPhoto | null;
}

/** A camera / library shot by URI, or one of the bundled collection photos. */
export type TaskPhoto = ImageSourcePropType;

/** dayNumber -> taskId -> progress */
export type Progress = Record<number, Record<string, TaskProgress>>;

export interface Profile {
  name: string;
  handle: string;
  bio: string | null;
  avatarSeed: string | null;
  /** A photo taken or picked for the profile circle. Wins over the seed. */
  avatar: TaskPhoto | null;
}

/** One thing pinned to a wall collection from the phone's photo library. */
export interface WallPin {
  id: string;
  title: string;
  photo: TaskPhoto;
  /** The note written under the title on the pin's own screen. */
  note?: string;
  link?: string;
}

/** A collection on your own wall: a name you can rename, and what is on it. */
export interface WallBoard {
  id: string;
  title: string;
  pins: WallPin[];
}

interface AppState {
  profile: Profile;

  /** Your own wall, in the order the collections are shown. */
  wall: WallBoard[];
  /**
   * The photo chosen for a pin that is still being written, held here rather
   * than passed through route params: a picked photo is an image source, which
   * is a bundled module as often as it is a URI, and neither survives being
   * turned into a string and back.
   */
  pinDraft: { boardId: string; photo: TaskPhoto } | null;

  /**
   * The day the app was first opened. The calendar runs from this month to the
   * current one, so it outlives any one challenge — restarting, or switching to
   * a different challenge, must not shorten the record of months already lived.
   */
  installedAt: Date;

  challenge: Challenge;
  /** Working copy of the task list — edited in the challenge detail screen. */
  tasks: ChallengeTask[];
  startDate: Date;
  totalDays: number;
  paused: boolean;

  progress: Progress;
  savedRecipeIds: string[];
  /** The emoji left on a feed post, by post id. */
  postReactions: Record<string, string>;
  inviteCode: string;

  /** 1-indexed, clamped to the challenge length. */
  currentDay: number;
  endDate: Date;
}

interface AppActions {
  setName: (name: string) => void;
  setBio: (bio: string | null) => void;
  setAvatarSeed: (seed: string | null) => void;
  setAvatarPhoto: (photo: TaskPhoto | null) => void;

  selectChallenge: (id: string) => void;
  setTasks: (tasks: ChallengeTask[]) => void;
  updateTaskLabel: (taskId: string, label: string) => void;
  addTask: () => void;
  deleteTask: (taskId: string) => void;
  reorderTask: (from: number, to: number) => void;

  setStartDate: (date: Date) => void;
  setTotalDays: (days: number) => void;
  setPaused: (paused: boolean) => void;
  restartChallenge: () => void;

  toggleTask: (taskId: string, day?: number) => void;
  setTaskPhoto: (taskId: string, photo: TaskPhoto | null, day?: number) => void;
  /**
   * A task is only ever ticked off by photographing it, so the shot and the
   * tick land together rather than through two calls that could be left half
   * applied. Retaking a photo on an already-done task keeps it done.
   */
  completeTaskWithPhoto: (taskId: string, photo: TaskPhoto, day?: number) => void;
  /** The other half of that bargain: the tick goes, and the proof goes with it. */
  undoTask: (taskId: string, day?: number) => void;

  renameWallBoard: (boardId: string, title: string) => void;
  /** Opens a pin for `boardId` on the picked photo, for the Create Pin screen. */
  startPinDraft: (boardId: string, photo: TaskPhoto) => void;
  setPinDraftPhoto: (photo: TaskPhoto) => void;
  clearPinDraft: () => void;
  /** Commits the draft to its board. Nothing to commit is a no-op. */
  addWallPin: (pin: { title: string; note?: string; link?: string }) => void;
  /** Rewrites a pin already on the wall, found by id across every board. */
  updateWallPin: (
    pinId: string,
    patch: { title: string; note?: string; link?: string; photo?: TaskPhoto },
  ) => void;

  toggleSavedRecipe: (id: string) => void;
  /** Tapping the emoji already on a post takes it back off. */
  reactToPost: (postId: string, emoji: string) => void;
  resetAll: () => void;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_DAY = 5;

/**
 * How long ago the seeded account downloaded the app. Deliberately well before
 * the seeded challenge began: the calendar starts at the install month, not at
 * day one, and a seed that put the two on the same day would hide that.
 */
const SEED_INSTALLED_DAYS_AGO = 40;

/**
 * Pin ids only have to be unique within a session; there is no backend. They
 * carry no board name: a board is identified by its title, titles have spaces
 * in them, and the id travels as a URL segment when a pin is opened.
 */
let pinSeq = 0;

/**
 * The wall opens with four of its eight collections already filled, from the
 * photographed sets that ship with the app — an empty wall gives no idea what
 * one is for. A collection is matched to its set by title, so the four with
 * nothing behind them (Wishlist, Supplements, Podcasts, Playlists) start bare
 * and are the ones to fill by hand.
 *
 * Ids are prefixed rather than reused: the same photographed items stand on
 * friends' walls under their own ids, and a pin sharing one would put a pencil
 * on somebody else's page.
 */
const seedWall = (): WallBoard[] =>
  WALL_SECTIONS.map((title) => ({
    id: title,
    title,
    pins:
      WALL_COLLECTIONS.find((set) => set.title === title)?.items.flatMap(
        (item) =>
          item.photo
            ? [
                {
                  id: `pin-seed-${item.id}`,
                  title: item.title,
                  photo: item.photo,
                  // Written as one field on the pin screen, so the lines the
                  // set carries are joined back into the breaks you would
                  // have typed.
                  note: item.note?.join('\n'),
                },
              ]
            : [],
      ) ?? [],
  }));
const SEED_CHALLENGE = CHALLENGES[0];

/**
 * Real shots standing in for the proof photos on the current day, keyed by
 * task id. Everything before day 5 keeps the drawn placeholders — these are
 * the two the home screen actually shows.
 */
const SEED_PHOTOS: Readonly<Record<string, TaskPhoto>> = {
  h1: require('../assets/tasks/patio-sandwiches-iced-coffee.jpg'),
  h2: require('../assets/tasks/timed-water-bottle-walk.jpg'),
};

/**
 * The history behind today, day -> task id -> shot. Photos already bundled for
 * the wall, the feed and the challenge tiles are reused here rather than
 * shipping a second copy of the same kind of picture: what each one shows
 * matches the task it is filed under, which is what the drawn stand-ins could
 * never do. Days list three of the five tasks, the way a real week looks.
 */
const SEED_DAY_PHOTOS: Readonly<Record<number, Readonly<Record<string, TaskPhoto>>>> = {
  1: {
    h1: require('../assets/wall/eat/spinach-eggs-avocado-toast.jpg'),
    h3: require('../assets/challenges/soft/sunset-walk.jpg'),
    h4: require('../assets/wall/workouts/home-mat-core.jpg'),
  },
  2: {
    h1: require('../assets/wall/eat/sesame-chicken-rice-bowl.jpg'),
    h4: require('../assets/wall/workouts/gym-plank.jpg'),
    h5: require('../assets/challenges/medium/book-in-bed.jpg'),
  },
  3: {
    h1: require('../assets/wall/eat/salmon-rice-asparagus.jpg'),
    h2: require('../assets/challenges/medium/infused-water.jpg'),
    h3: require('../assets/wall/workouts/treadmill-incline-walk.jpg'),
  },
  4: {
    h1: require('../assets/wall/eat/berry-watermelon-plate.jpg'),
    h4: require('../assets/challenges/medium/outdoor-run.jpg'),
    h5: require('../assets/feed/posts/park-bench-reading.jpg'),
  },
};

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Builds a few days of plausible history so the profile grid, post-it wall and
 * sticker sheet are not empty on first launch.
 */
function seedProgress(tasks: readonly ChallengeTask[]): Progress {
  const progress: Progress = {};

  for (let day = 1; day < SEED_DAY; day += 1) {
    progress[day] = {};
    const shots = SEED_DAY_PHOTOS[day];
    tasks.forEach((t, i) => {
      // The bundled shots are keyed to this challenge's tasks; a challenge
      // with ids of its own falls back to the drawn stand-ins.
      const photo = shots?.[t.id] ?? null;
      progress[day][t.id] = {
        done: true,
        time: `${7 + i}:${(12 + i * 7) % 60}`.padEnd(5, '0') + 'am',
        photo,
        photoSeed: !shots && i < 3 ? `day${day}-${t.id}` : null,
      };
    });
  }

  // Today: first two ticked, the rest still open — matches the home screenshot.
  progress[SEED_DAY] = {};
  tasks.forEach((t, i) => {
    // A bundled shot wins over the drawn stand-in, the same way a photo the
    // user picks does: the seed is what fills the slot until there is a real
    // picture for it.
    const photo = SEED_PHOTOS[t.id] ?? null;
    progress[SEED_DAY][t.id] = {
      done: i < 2,
      time: i < 2 ? '7:19am' : undefined,
      photo,
      photoSeed: !photo && i < 2 ? `day${SEED_DAY}-${t.id}` : null,
    };
  });

  return progress;
}

function makeInviteCode(): string {
  const chars = '0123456789ABCDEF';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({
    name: 'Julia',
    handle: '@julia_575',
    bio: null,
    avatarSeed: null,
    avatar: null,
  });

  // Set once and never written again: you only ever download the app the once,
  // so there is no action that moves it and nothing to reset it to.
  const [installedAt] = useState<Date>(() =>
    addDays(startOfToday(), -SEED_INSTALLED_DAYS_AGO),
  );

  const [challenge, setChallenge] = useState<Challenge>(SEED_CHALLENGE);
  const [tasks, setTasksState] = useState<ChallengeTask[]>(() =>
    tinted(SEED_CHALLENGE.tasks),
  );
  const [startDate, setStartDateState] = useState<Date>(
    addDays(startOfToday(), -(SEED_DAY - 1)),
  );
  const [totalDays, setTotalDays] = useState(SEED_CHALLENGE.defaultDays);
  const [paused, setPaused] = useState(false);
  // Every collection the wall offers starts named but empty; the reference
  // wall is a set of headings waiting to be filled, not a seeded gallery.
  const [wall, setWall] = useState<WallBoard[]>(seedWall);
  const [pinDraft, setPinDraft] = useState<
    { boardId: string; photo: TaskPhoto } | null
  >(null);
  const [progress, setProgress] = useState<Progress>(() =>
    seedProgress(SEED_CHALLENGE.tasks),
  );
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([
    'avo-toast',
    'salmon-tartine',
  ]);
  // Seeded from the posts that ship already reacted to, so those stay as they
  // are until someone taps the emoji back off.
  const [postReactions, setPostReactions] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        FEED_POSTS.filter((p) => p.reaction).map((p) => [p.id, p.reaction!]),
      ),
  );
  const [inviteCode] = useState(makeInviteCode);

  // -- derived ---------------------------------------------------------------

  const currentDay = useMemo(() => {
    const elapsed = Math.floor(
      (startOfToday().getTime() - startDate.getTime()) / 86_400_000,
    );
    return Math.min(Math.max(elapsed + 1, 1), totalDays);
  }, [startDate, totalDays]);

  const endDate = useMemo(
    () => addDays(startDate, totalDays - 1),
    [startDate, totalDays],
  );

  // -- actions ---------------------------------------------------------------

  const setName = useCallback((name: string) => {
    setProfile((p) => ({ ...p, name }));
  }, []);

  const setBio = useCallback((bio: string | null) => {
    setProfile((p) => ({ ...p, bio }));
  }, []);

  const setAvatarSeed = useCallback((avatarSeed: string | null) => {
    setProfile((p) => ({ ...p, avatarSeed }));
  }, []);

  const setAvatarPhoto = useCallback((avatar: TaskPhoto | null) => {
    setProfile((p) => ({ ...p, avatar }));
  }, []);

  const selectChallenge = useCallback((id: string) => {
    const next = id === CUSTOM_CHALLENGE.id ? CUSTOM_CHALLENGE : challengeById(id);
    setChallenge(next);
    setTasksState(tinted(next.tasks));
    setTotalDays(next.defaultDays);
    setProgress({});
  }, []);

  const setTasks = useCallback((next: ChallengeTask[]) => {
    setTasksState(next);
  }, []);

  const updateTaskLabel = useCallback((taskId: string, label: string) => {
    setTasksState((list) =>
      list.map((t) => (t.id === taskId ? { ...t, label } : t)),
    );
  }, []);

  const addTask = useCallback(() => {
    setTasksState((list) => [
      ...list,
      {
        id: `t${Date.now()}`,
        label: `Task ${list.length + 1}`,
        tint: nextTint(list),
      },
    ]);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasksState((list) => list.filter((t) => t.id !== taskId));
    // Its ticks and proof photos go with it. Left behind they would be picked
    // up by whatever task is added next under a recycled key, and would go on
    // counting towards days that no longer have that task in them.
    setProgress((days) =>
      Object.fromEntries(
        Object.entries(days).map(([day, rows]) => {
          const { [taskId]: _gone, ...rest } = rows;
          return [Number(day), rest];
        }),
      ),
    );
  }, []);

  const reorderTask = useCallback((from: number, to: number) => {
    setTasksState((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const setStartDate = useCallback((date: Date) => {
    setStartDateState(date);
  }, []);

  const restartChallenge = useCallback(() => {
    setStartDateState(startOfToday());
    setProgress({});
  }, []);

  const toggleTask = useCallback(
    (taskId: string, day?: number) => {
      const target = day ?? currentDay;
      setProgress((prev) => {
        const dayMap = prev[target] ?? {};
        const existing = dayMap[taskId];
        const nextDone = !existing?.done;
        return {
          ...prev,
          [target]: {
            ...dayMap,
            [taskId]: {
              // Spread first: a proof photo belongs to the task, not to the
              // tick, so ticking one off — or back on — has to leave the shot
              // and its stand-in exactly where they were.
              ...existing,
              done: nextDone,
              time: nextDone ? timeStamp(new Date()) : undefined,
              photoSeed: existing?.photoSeed ?? null,
            },
          },
        };
      });
    },
    [currentDay],
  );

  /** Attaches the photo just taken or picked, or clears the slot with null. */
  const setTaskPhoto = useCallback(
    (taskId: string, photo: TaskPhoto | null, day?: number) => {
      const target = day ?? currentDay;
      setProgress((prev) => {
        const dayMap = prev[target] ?? {};
        const existing = dayMap[taskId] ?? { done: false };
        return {
          ...prev,
          [target]: {
            ...dayMap,
            [taskId]: {
              ...existing,
              photo,
              // A real photo replaces the seeded stand-in rather than sitting
              // behind it, so clearing one leaves an empty slot.
              photoSeed: null,
            },
          },
        };
      });
    },
    [currentDay],
  );

  const completeTaskWithPhoto = useCallback(
    (taskId: string, photo: TaskPhoto, day?: number) => {
      const target = day ?? currentDay;
      setProgress((prev) => {
        const dayMap = prev[target] ?? {};
        const existing = dayMap[taskId];
        return {
          ...prev,
          [target]: {
            ...dayMap,
            [taskId]: {
              ...existing,
              done: true,
              // Retaking leaves the original stamp alone: the task was done
              // when it was first photographed, not when it was reshot.
              time: existing?.done ? existing.time : timeStamp(new Date()),
              photo,
              // A real photo replaces the seeded stand-in rather than sitting
              // behind it.
              photoSeed: null,
            },
          },
        };
      });
    },
    [currentDay],
  );

  const undoTask = useCallback(
    (taskId: string, day?: number) => {
      const target = day ?? currentDay;
      setProgress((prev) => {
        const dayMap = prev[target] ?? {};
        return {
          ...prev,
          [target]: {
            ...dayMap,
            [taskId]: {
              done: false,
              time: undefined,
              photo: null,
              photoSeed: null,
            },
          },
        };
      });
    },
    [currentDay],
  );

  const renameWallBoard = useCallback((boardId: string, title: string) => {
    setWall((prev) =>
      prev.map((board) =>
        board.id === boardId ? { ...board, title } : board,
      ),
    );
  }, []);

  const startPinDraft = useCallback((boardId: string, photo: TaskPhoto) => {
    setPinDraft({ boardId, photo });
  }, []);

  const setPinDraftPhoto = useCallback((photo: TaskPhoto) => {
    setPinDraft((prev) => (prev ? { ...prev, photo } : prev));
  }, []);

  const clearPinDraft = useCallback(() => setPinDraft(null), []);

  const addWallPin = useCallback(
    (pin: { title: string; note?: string; link?: string }) => {
      setPinDraft((draft) => {
        if (!draft) return null;
        const entry: WallPin = {
          id: `pin-${pinSeq++}`,
          title: pin.title,
          photo: draft.photo,
          note: pin.note,
          link: pin.link,
        };
        setWall((prev) =>
          prev.map((board) =>
            board.id === draft.boardId
              ? { ...board, pins: [...board.pins, entry] }
              : board,
          ),
        );
        return null;
      });
    },
    [],
  );

  const updateWallPin = useCallback(
    (
      pinId: string,
      patch: { title: string; note?: string; link?: string; photo?: TaskPhoto },
    ) => {
      setWall((prev) =>
        prev.map((board) => {
          if (!board.pins.some((pin) => pin.id === pinId)) return board;
          return {
            ...board,
            pins: board.pins.map((pin) =>
              pin.id === pinId ? { ...pin, ...patch } : pin,
            ),
          };
        }),
      );
    },
    [],
  );

  const toggleSavedRecipe = useCallback((id: string) => {
    setSavedRecipeIds((list) =>
      list.includes(id) ? list.filter((r) => r !== id) : [...list, id],
    );
  }, []);

  const reactToPost = useCallback((postId: string, emoji: string) => {
    setPostReactions((map) => {
      if (map[postId] === emoji) {
        const { [postId]: _removed, ...rest } = map;
        return rest;
      }
      return { ...map, [postId]: emoji };
    });
  }, []);

  const resetAll = useCallback(() => {
    setChallenge(SEED_CHALLENGE);
    setTasksState(tinted(SEED_CHALLENGE.tasks));
    setStartDateState(addDays(startOfToday(), -(SEED_DAY - 1)));
    setTotalDays(SEED_CHALLENGE.defaultDays);
    setProgress(seedProgress(SEED_CHALLENGE.tasks));
    setProfile({
      name: 'Julia',
      handle: '@julia_575',
      bio: null,
      avatarSeed: null,
      avatar: null,
    });
    setWall(seedWall());
    setPinDraft(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      installedAt,
      challenge,
      tasks,
      startDate,
      totalDays,
      paused,
      progress,
      savedRecipeIds,
      postReactions,
      inviteCode,
      currentDay,
      endDate,
      wall,
      pinDraft,

      setName,
      setBio,
      setAvatarSeed,
      setAvatarPhoto,
      selectChallenge,
      setTasks,
      updateTaskLabel,
      addTask,
      deleteTask,
      reorderTask,
      setStartDate,
      setTotalDays,
      setPaused,
      restartChallenge,
      toggleTask,
      setTaskPhoto,
      completeTaskWithPhoto,
      undoTask,
      renameWallBoard,
      startPinDraft,
      setPinDraftPhoto,
      clearPinDraft,
      addWallPin,
      updateWallPin,
      toggleSavedRecipe,
      reactToPost,
      resetAll,
    }),
    [
      profile, installedAt, challenge, tasks, startDate, totalDays,
      paused, progress, savedRecipeIds, postReactions, inviteCode,
      currentDay, endDate, wall, pinDraft,
      setName, setBio, setAvatarSeed, setAvatarPhoto, selectChallenge, setTasks,
      updateTaskLabel, addTask, deleteTask, reorderTask, setStartDate, restartChallenge,
      toggleTask, setTaskPhoto, completeTaskWithPhoto, undoTask,
      toggleSavedRecipe, reactToPost, resetAll,
      renameWallBoard, startPinDraft, setPinDraftPhoto, clearPinDraft,
      addWallPin, updateWallPin,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Progress for one day, defaulted so callers never deal with undefined. */
export function useDayProgress(day: number) {
  const { progress, tasks } = useApp();
  return useMemo(() => {
    const map = progress[day] ?? {};
    return tasks.map((task) => ({
      task,
      ...(map[task.id] ?? { done: false, photoSeed: null }),
    }));
  }, [progress, day, tasks]);
}
