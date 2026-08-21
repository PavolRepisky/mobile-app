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
  type Challenge,
  type ChallengeTask,
} from '@/data/challenges';
import { addDays, timeStamp } from '@/lib/format';

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
}

/** dayNumber -> taskId -> progress */
export type Progress = Record<number, Record<string, TaskProgress>>;

export interface Profile {
  name: string;
  handle: string;
  bio: string | null;
  avatarSeed: string | null;
}

interface AppState {
  profile: Profile;

  challenge: Challenge;
  /** Working copy of the task list — edited in the challenge detail screen. */
  tasks: ChallengeTask[];
  startDate: Date;
  totalDays: number;
  paused: boolean;

  progress: Progress;
  savedRecipeIds: string[];
  inviteCode: string;

  /** 1-indexed, clamped to the challenge length. */
  currentDay: number;
  endDate: Date;
}

interface AppActions {
  setName: (name: string) => void;
  setBio: (bio: string | null) => void;
  setAvatarSeed: (seed: string | null) => void;

  selectChallenge: (id: string) => void;
  setTasks: (tasks: ChallengeTask[]) => void;
  updateTaskLabel: (taskId: string, label: string) => void;
  addTask: () => void;
  reorderTask: (from: number, to: number) => void;

  setStartDate: (date: Date) => void;
  setTotalDays: (days: number) => void;
  setPaused: (paused: boolean) => void;
  restartChallenge: () => void;

  toggleTask: (taskId: string, day?: number) => void;
  attachPhoto: (taskId: string, day?: number) => void;

  toggleSavedRecipe: (id: string) => void;
  resetAll: () => void;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_DAY = 5;
const SEED_CHALLENGE = CHALLENGES[0];

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
    tasks.forEach((t, i) => {
      progress[day][t.id] = {
        done: true,
        time: `${7 + i}:${(12 + i * 7) % 60}`.padEnd(5, '0') + 'am',
        photoSeed: i < 3 ? `day${day}-${t.id}` : null,
      };
    });
  }

  // Today: first two ticked, the rest still open — matches the home screenshot.
  progress[SEED_DAY] = {};
  tasks.forEach((t, i) => {
    progress[SEED_DAY][t.id] = {
      done: i < 2,
      time: i < 2 ? '7:19am' : undefined,
      photoSeed: i < 2 ? `day${SEED_DAY}-${t.id}` : null,
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
  });

  const [challenge, setChallenge] = useState<Challenge>(SEED_CHALLENGE);
  const [tasks, setTasksState] = useState<ChallengeTask[]>([
    ...SEED_CHALLENGE.tasks,
  ]);
  const [startDate, setStartDateState] = useState<Date>(
    addDays(startOfToday(), -(SEED_DAY - 1)),
  );
  const [totalDays, setTotalDays] = useState(SEED_CHALLENGE.defaultDays);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<Progress>(() =>
    seedProgress(SEED_CHALLENGE.tasks),
  );
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([
    'avo-toast',
    'salmon-tartine',
  ]);
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

  const selectChallenge = useCallback((id: string) => {
    const next = id === CUSTOM_CHALLENGE.id ? CUSTOM_CHALLENGE : challengeById(id);
    setChallenge(next);
    setTasksState([...next.tasks]);
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
      { id: `t${Date.now()}`, label: `Task ${list.length + 1}` },
    ]);
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

  /** Stands in for the camera: attaches (or clears) a placeholder photo. */
  const attachPhoto = useCallback(
    (taskId: string, day?: number) => {
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
              photoSeed: existing.photoSeed
                ? null
                : `day${target}-${taskId}-${Date.now() % 97}`,
            },
          },
        };
      });
    },
    [currentDay],
  );

  const toggleSavedRecipe = useCallback((id: string) => {
    setSavedRecipeIds((list) =>
      list.includes(id) ? list.filter((r) => r !== id) : [...list, id],
    );
  }, []);

  const resetAll = useCallback(() => {
    setChallenge(SEED_CHALLENGE);
    setTasksState([...SEED_CHALLENGE.tasks]);
    setStartDateState(addDays(startOfToday(), -(SEED_DAY - 1)));
    setTotalDays(SEED_CHALLENGE.defaultDays);
    setProgress(seedProgress(SEED_CHALLENGE.tasks));
    setProfile({
      name: 'Julia',
      handle: '@julia_575',
      bio: null,
      avatarSeed: null,
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      challenge,
      tasks,
      startDate,
      totalDays,
      paused,
      progress,
      savedRecipeIds,
      inviteCode,
      currentDay,
      endDate,

      setName,
      setBio,
      setAvatarSeed,
      selectChallenge,
      setTasks,
      updateTaskLabel,
      addTask,
      reorderTask,
      setStartDate,
      setTotalDays,
      setPaused,
      restartChallenge,
      toggleTask,
      attachPhoto,
      toggleSavedRecipe,
      resetAll,
    }),
    [
      profile, challenge, tasks, startDate, totalDays,
      paused, progress, savedRecipeIds, inviteCode, currentDay, endDate,
      setName, setBio, setAvatarSeed, selectChallenge, setTasks,
      updateTaskLabel, addTask, reorderTask, setStartDate, restartChallenge,
      toggleTask, attachPhoto, toggleSavedRecipe, resetAll,
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
