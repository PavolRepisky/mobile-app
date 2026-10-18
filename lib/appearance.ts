import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/**
 * Light or dark, or whatever the phone is set to — the choice in Settings.
 * It is the app's own, kept on the phone, and applied through the system's
 * own override, so every adaptive colour, system bar, sheet and control
 * follows it without being told.
 */
export type AppearanceChoice = 'system' | 'light' | 'dark';

/** In the order the Theme page lays them out, as the iPhone's own
 * Display settings do: the two fixed looks, then the one that follows. */
export const APPEARANCE_CHOICES: readonly { key: AppearanceChoice; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'Automatic' },
];

const STORAGE_KEY = 'appearance';

let current: AppearanceChoice = 'system';
const listeners = new Set<() => void>();

const apply = (choice: AppearanceChoice) => {
  current = choice;
  Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  listeners.forEach((listener) => listener());
};

const isChoice = (value: unknown): value is AppearanceChoice =>
  value === 'system' || value === 'light' || value === 'dark';

/** Puts back the last choice at launch, before the first screen shows. */
export async function restoreAppearance() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isChoice(saved)) apply(saved);
  } catch {
    // Unreadable storage leaves the phone's own setting in charge.
  }
}

export function setAppearance(choice: AppearanceChoice) {
  apply(choice);
  AsyncStorage.setItem(STORAGE_KEY, choice).catch(() => {});
}

export function useAppearance(): AppearanceChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
  );
}
