import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  CUSTOM_CHALLENGE,
  challengeById,
  type Challenge,
  type ChallengeCategory,
  type ChallengeTask,
} from '@/data/challenges';
import { FEED_POSTS } from '@/data/content';
import {
  SEED_CAPTIONS,
  SEED_CHALLENGE,
  SEED_PROFILE,
  seedProgress,
  seedStartDate,
} from '@/data/seed';
import { TROPHIES } from '@/data/trophies';
import { isoDay, timeStamp } from '@/lib/format';
import { DAY_MS, startOfToday } from '@/lib/round';
import type { ImageSourcePropType } from 'react-native';

/**
 * All app state lives here, in memory. There is no backend yet — the
 * provider starts from the demo account in `data/seed`, Day 5 of Her 75 with
 * a few days of history, and goes back to it on reset. The actions below are
 * the app's whole write surface: each is where a call to the backend goes.
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
  /**
   * Which cell of the day's grid the photo was shot into, counted in the
   * grid's own order. Left out where nobody chose — seeded history — and the
   * task takes the first free cell instead; see `orderBySlot`.
   */
  slot?: number;
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

/**
 * The signed-in account's own reply on a friend's post. `parentId` nests it
 * one level under a seeded or own top-level comment, the way Instagram's own
 * threads never go past a single level — a reply to a reply still hangs off
 * the top-level comment, not off the reply itself.
 */
/**
 * When the app nudges you, picked while joining, as minutes after midnight or
 * null for Never: a time for each task, by task id — a task with no entry
 * takes `DEFAULT_TASK_REMINDER` — and the last call, which only fires if a
 * task is still missing. Saved only for now — nothing schedules them yet.
 */
export interface Reminders {
  tasks: Record<string, number | null>;
  lastCall: number | null;
}

/** Eight in the morning: early enough to plan the day round. */
export const DEFAULT_TASK_REMINDER = 8 * 60;

/** Ten at night: two hours before midnight ends the day, time enough to
 * still take a photo. */
const DEFAULT_LAST_CALL = 22 * 60;

const DEFAULT_REMINDERS: Reminders = { tasks: {}, lastCall: DEFAULT_LAST_CALL };

export interface FriendComment {
  id: string;
  text: string;
  parentId: string | null;
}

interface AppState {
  profile: Profile;

  challenge: Challenge;
  /** Working copy of the task list — edited in the challenge detail screen. */
  tasks: ChallengeTask[];
  startDate: Date;
  totalDays: number;

  progress: Progress;
  /** What you wrote under each day's post, by challenge day — the caption
   * your own posts show. A day can go without one. */
  captions: Record<number, string>;
  /** The emoji left on a feed post, by post id — also used for a friend's
   * post on the Friends tab, keyed by their friend id. */
  postReactions: Record<string, string>;
  /** Comments the signed-in account has left on a friend's post, by friend
   * id, oldest first — the seeded ones already on a post live in `Friend`
   * itself, not here. */
  friendComments: Record<string, FriendComment[]>;
  /** The story photos you've already seen, by whose story it is (a friend's
   * id, or `me-<day>` for yours) — the keys the story viewer gives each. */
  watchedStories: Record<string, readonly string[]>;
  /** People you've sent a friend request to, by id — a request, not a
   * friend yet. Held here so every Add (Members, In it with you, Find
   * friends, a profile) shows the same state. */
  friendRequests: ReadonlySet<string>;

  /** Challenges carried to the last day. One trophy, one finish. */
  trophies: number;

  /** The challenges you've built yourself, oldest first — what Search's
   * Created by you lists, and what can still be edited until Day 1. */
  customChallenges: readonly Challenge[];

  /** The two nudges picked while joining a challenge. */
  reminders: Reminders;

  /** 1-indexed, clamped to the challenge length. */
  currentDay: number;

  /** The allowance a challenge starts with, so a screen can show "2 of 3". */
  livesTotal: number;
  /** What is left of that allowance, floored at zero. */
  livesLeft: number;

  /**
   * True once *today* has a task finished with an actual photo attached —
   * not just ticked, not standing behind a seeded placeholder, and not an
   * older day's streak carrying today. Gates the Community feed: a day
   * nobody has proven yet has no post of its own to read anyone else's
   * against, and yesterday's photo doesn't stand in for today's.
   */
  hasPhotographedTask: boolean;
}

/** What the create-challenge form hands over. A task keeps its `id` when
 * it's being edited, so anything keyed by it survives the edit. */
export interface ChallengeInput {
  name: string;
  description: string;
  category?: ChallengeCategory;
  photos: readonly TaskPhoto[];
  tasks: readonly { id?: string; label: string; note?: string }[];
  days: number;
  startDate: Date;
  lives: number;
}

interface AppActions {
  setName: (name: string) => void;
  setBio: (bio: string | null) => void;
  setHandle: (handle: string) => void;
  setAvatarSeed: (seed: string | null) => void;
  setAvatarPhoto: (photo: TaskPhoto | null) => void;

  /** Takes the challenge on. A round everyone shares passes its Day 1, so
   * your days count from the same morning as everyone else's. */
  selectChallenge: (id: string, startDate?: Date) => void;
  /** Builds a new custom challenge from the create-challenge form, adds it to
   * the challenges `selectChallenge` can pick, and hands it back so the screen
   * can navigate on. */
  addChallenge: (input: ChallengeInput) => Challenge;
  /** Rewrites a challenge you built from the same form. Only before Day 1 —
   * once it has started, people have joined on its terms. If it's the one
   * you're on, your round follows the new start, length and tasks. */
  updateChallenge: (id: string, input: ChallengeInput) => void;
  /** Takes a challenge you built down. If it's the one you're on, you go
   * back to the seeded challenge, the way a fresh install opens. */
  deleteChallenge: (id: string) => void;
  setTotalDays: (days: number) => void;
  setReminders: (reminders: Reminders) => void;

  /**
   * A task is only ever ticked off by photographing it, so the shot and the
   * tick land together rather than through two calls that could be left half
   * applied. Retaking a photo on an already-done task keeps it done.
   */
  completeTaskWithPhoto: (taskId: string, photo: TaskPhoto, day?: number, slot?: number) => void;
  /** The other half of that bargain: the tick goes, and the proof goes with it. */
  undoTask: (taskId: string, day?: number) => void;

  /** Tapping the emoji already on a post takes it back off. */
  reactToPost: (postId: string, emoji: string) => void;
  /** Sends a friend request, or takes back one already sent. */
  toggleFriendRequest: (id: string) => void;
  /** Marks one photo in someone's story as seen; seeing it again is a no-op. */
  markStoryWatched: (owner: string, story: string) => void;
  /** Appends a comment to a friend's post — a reply to `parentId` if given,
   * a fresh top-level comment otherwise. Blank text is a no-op. */
  addFriendComment: (
    friendId: string,
    text: string,
    parentId?: string | null,
  ) => void;
  resetAll: () => void;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

/**
 * Days you are allowed to miss before the challenge is lost. Three whatever
 * the challenge and however long it runs — a rule you can hold in your head
 * is the point of it, and one that moved with the length would have to be
 * explained on every screen that shows it. A challenge you build yourself can
 * set its own on the create form; this is where that form starts.
 */
export const LIVES_PER_CHALLENGE = 3;

/** A custom challenge out of the form's fields. Tasks carried over from an
 * edit keep their ids; new ones get fresh ones. */
function buildChallenge(id: string, input: ChallengeInput): Challenge {
  const stamp = Date.now();
  return {
    id,
    name: input.name,
    stamp: 'Custom',
    description: input.description,
    category: input.category,
    joined: 0,
    photoSeeds: [],
    photos: input.photos,
    defaultDays: input.days,
    startDate: isoDay(input.startDate),
    lives: input.lives,
    tasks: input.tasks.map(({ id: taskId, ...t }, i) => ({ id: taskId ?? `ct${stamp}-${i}`, ...t })),
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);

  const [challenge, setChallenge] = useState<Challenge>(SEED_CHALLENGE);
  const [tasks, setTasksState] = useState<ChallengeTask[]>(() =>
    [...SEED_CHALLENGE.tasks],
  );
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);
  const [startDate, setStartDateState] = useState<Date>(seedStartDate);
  const [totalDays, setTotalDays] = useState(SEED_CHALLENGE.defaultDays);
  const [progress, setProgress] = useState<Progress>(() =>
    seedProgress(SEED_CHALLENGE.tasks),
  );
  const [captions, setCaptions] = useState<Record<number, string>>(SEED_CAPTIONS);
  // Seeded from the posts that ship already reacted to, so those stay as they
  // are until someone taps the emoji back off.
  const [postReactions, setPostReactions] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        FEED_POSTS.filter((p) => p.reaction).map((p) => [p.id, p.reaction!]),
      ),
  );
  const [friendComments, setFriendComments] = useState<Record<string, FriendComment[]>>({});
  const [watchedStories, setWatchedStories] = useState<Record<string, readonly string[]>>({});
  const [friendRequests, setFriendRequests] = useState<ReadonlySet<string>>(new Set());
  // Challenges the seeded account has already finished — see data/trophies.
  // Nothing increments this yet: reaching the last day is not an event the
  // app observes, so the list is seeded and left alone until finishing a
  // challenge is wired up.
  const [trophies] = useState(TROPHIES.length);
  const [reminders, setReminders] = useState<Reminders>(DEFAULT_REMINDERS);

  // -- derived ---------------------------------------------------------------

  const currentDay = useMemo(() => {
    const elapsed = Math.floor(
      (startOfToday().getTime() - startDate.getTime()) / DAY_MS,
    );
    return Math.min(Math.max(elapsed + 1, 1), totalDays);
  }, [startDate, totalDays]);

  /**
   * Only days that are fully behind you can be missed — today is still open
   * however little of it is ticked, which is why the walk stops short of
   * `currentDay` rather than including it.
   */
  const missedDays = useMemo(() => {
    let missed = 0;
    for (let day = 1; day < currentDay; day += 1) {
      const rows = progress[day];
      if (!tasks.every((t) => rows?.[t.id]?.done)) missed += 1;
    }
    return missed;
  }, [progress, currentDay, tasks]);

  // Floored rather than left negative: past the allowance the challenge is
  // lost, and how far past says nothing more than that.
  const livesTotal = challenge.lives ?? LIVES_PER_CHALLENGE;
  const livesLeft = Math.max(0, livesTotal - missedDays);

  // Today only, not the challenge's whole history — the gate this feeds
  // asks what today has proven, so an old streak can't stand in for a photo
  // that still hasn't been taken since.
  const hasPhotographedTask = useMemo(
    () => Object.values(progress[currentDay] ?? {}).some((entry) => entry.done && entry.photo),
    [progress, currentDay],
  );

  // -- actions ---------------------------------------------------------------

  const setName = useCallback((name: string) => {
    setProfile((p) => ({ ...p, name }));
  }, []);

  const setBio = useCallback((bio: string | null) => {
    setProfile((p) => ({ ...p, bio }));
  }, []);

  const setHandle = useCallback((handle: string) => {
    setProfile((p) => ({ ...p, handle }));
  }, []);

  const setAvatarSeed = useCallback((avatarSeed: string | null) => {
    setProfile((p) => ({ ...p, avatarSeed }));
  }, []);

  const setAvatarPhoto = useCallback((avatar: TaskPhoto | null) => {
    setProfile((p) => ({ ...p, avatar }));
  }, []);

  const selectChallenge = useCallback(
    (id: string, start?: Date) => {
      const next =
        id === CUSTOM_CHALLENGE.id
          ? CUSTOM_CHALLENGE
          : customChallenges.find((c) => c.id === id) ?? challengeById(id);
      setChallenge(next);
      setTasksState([...next.tasks]);
      setTotalDays(next.defaultDays);
      if (start) setStartDateState(start);
      setProgress({});
      setCaptions({});
    },
    [customChallenges],
  );

  const addChallenge = useCallback((input: ChallengeInput) => {
    const built = buildChallenge(`custom-${Date.now()}`, input);
    setCustomChallenges((list) => [...list, built]);
    return built;
  }, []);

  const updateChallenge = useCallback(
    (id: string, input: ChallengeInput) => {
      const existing = customChallenges.find((c) => c.id === id);
      if (!existing) return;
      const built: Challenge = { ...buildChallenge(id, input), joined: existing.joined };
      setCustomChallenges((list) => list.map((c) => (c.id === id ? built : c)));
      if (challenge.id === id) {
        setChallenge(built);
        setTasksState([...built.tasks]);
        setTotalDays(built.defaultDays);
        setStartDateState(input.startDate);
      }
    },
    [customChallenges, challenge.id],
  );

  const deleteChallenge = useCallback(
    (id: string) => {
      setCustomChallenges((list) => list.filter((c) => c.id !== id));
      if (challenge.id === id) {
        setChallenge(SEED_CHALLENGE);
        setTasksState([...SEED_CHALLENGE.tasks]);
        setTotalDays(SEED_CHALLENGE.defaultDays);
        setStartDateState(seedStartDate());
        setProgress(seedProgress(SEED_CHALLENGE.tasks));
        setCaptions(SEED_CAPTIONS);
      }
    },
    [challenge.id],
  );

  const completeTaskWithPhoto = useCallback(
    (taskId: string, photo: TaskPhoto, day?: number, slot?: number) => {
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
              // A retake without a cell of its own stays where it was.
              slot: slot ?? existing?.slot,
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
              slot: undefined,
            },
          },
        };
      });
    },
    [currentDay],
  );

  const reactToPost = useCallback((postId: string, emoji: string) => {
    setPostReactions((map) => {
      if (map[postId] === emoji) {
        const { [postId]: _removed, ...rest } = map;
        return rest;
      }
      return { ...map, [postId]: emoji };
    });
  }, []);

  const toggleFriendRequest = useCallback((id: string) => {
    setFriendRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const markStoryWatched = useCallback((owner: string, story: string) => {
    setWatchedStories((map) =>
      map[owner]?.includes(story) ? map : { ...map, [owner]: [...(map[owner] ?? []), story] },
    );
  }, []);

  const addFriendComment = useCallback(
    (friendId: string, text: string, parentId: string | null = null) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const entry: FriendComment = {
        // No backend to hand out ids, so one is drawn from the clock and a
        // few random characters — unique enough for a single running session.
        id: `${friendId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        parentId,
      };
      setFriendComments((map) => ({
        ...map,
        [friendId]: [...(map[friendId] ?? []), entry],
      }));
    },
    [],
  );

  const resetAll = useCallback(() => {
    setChallenge(SEED_CHALLENGE);
    setTasksState([...SEED_CHALLENGE.tasks]);
    setStartDateState(seedStartDate());
    setTotalDays(SEED_CHALLENGE.defaultDays);
    setProgress(seedProgress(SEED_CHALLENGE.tasks));
    setCaptions(SEED_CAPTIONS);
    // Back to the demo account, less its bio — a reset reads as starting
    // over, not as the seeded page coming back word for word.
    setProfile({ ...SEED_PROFILE, bio: null });
    setFriendComments({});
    setFriendRequests(new Set());
    setReminders(DEFAULT_REMINDERS);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      challenge,
      tasks,
      startDate,
      totalDays,
      progress,
      captions,
      postReactions,
      friendComments,
      watchedStories,
      friendRequests,
      trophies,
      customChallenges,
      reminders,
      currentDay,
      livesTotal,
      livesLeft,
      hasPhotographedTask,

      setName,
      setBio,
      setHandle,
      setAvatarSeed,
      setAvatarPhoto,
      selectChallenge,
      addChallenge,
      updateChallenge,
      deleteChallenge,
      setTotalDays,
      setReminders,
      completeTaskWithPhoto,
      undoTask,
      reactToPost,
      toggleFriendRequest,
      markStoryWatched,
      addFriendComment,
      resetAll,
    }),
    [
      profile, challenge, tasks, startDate, totalDays,
      progress, captions, postReactions, friendComments, watchedStories, friendRequests,
      trophies, customChallenges, reminders,
      currentDay, livesLeft, hasPhotographedTask,
      setName, setBio, setHandle, setAvatarSeed, setAvatarPhoto, selectChallenge, addChallenge,
      updateChallenge, deleteChallenge,
      completeTaskWithPhoto, undoTask,
      reactToPost, toggleFriendRequest, markStoryWatched, addFriendComment, resetAll,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/**
 * A day's tasks in the order its grid shows them — the Tasks tab, the post it
 * goes up as, the profile tile and the week row all read this, so a photo
 * sits in the same cell everywhere. A done task stays in the cell it was shot
 * into; one with no cell of its own (seeded history) and the tasks still open
 * fill the free cells in checklist order, so an open cell always suggests
 * the next task on the list.
 */
export function orderBySlot<T extends { id: string }>(
  tasks: readonly T[],
  day: Record<string, TaskProgress> | undefined,
): T[] {
  const cells: (T | null)[] = tasks.map(() => null);
  const loose: T[] = [];
  for (const task of tasks) {
    const entry = day?.[task.id];
    const slot = entry?.done ? entry.slot : undefined;
    if (slot !== undefined && slot >= 0 && slot < cells.length && !cells[slot]) cells[slot] = task;
    else loose.push(task);
  }
  return cells.map((cell) => cell ?? loose.shift()!);
}

/** Progress for one day in its grid's order, defaulted so callers never deal
 * with undefined. */
export function useDayProgress(day: number) {
  const { progress, tasks } = useApp();
  return useMemo(() => {
    const map = progress[day] ?? {};
    return orderBySlot(tasks, map).map((task) => ({
      task,
      ...(map[task.id] ?? { done: false, photoSeed: null }),
    }));
  }, [progress, day, tasks]);
}

/** Every day so far with at least one photographed task, most recent first —
 * the profile grid and the day pager both read this same order, so paging
 * through an opened post lands on exactly the next tile down the grid. */
export function usePostedDays(): number[] {
  const { currentDay, tasks, progress } = useApp();
  return useMemo(() => {
    const days: number[] = [];
    for (let day = currentDay; day >= 1; day -= 1) {
      const posted = tasks.some((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed;
      });
      if (posted) days.push(day);
    }
    return days;
  }, [currentDay, tasks, progress]);
}
