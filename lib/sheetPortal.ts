import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * What a `BottomSheet` hands the system sheet it opens on the iPhone. The
 * sheet is a page of its own on the root stack — that is what the system's
 * form sheet is — but its contents still belong to the component that opened
 * it, with that component's state; so the component keeps rendering them and
 * posts each render here, and the sheet page shows whatever is posted under
 * its id.
 */
export interface SheetEntry {
  children: ReactNode;
  onDismiss: () => void;
  padded: boolean;
  /** A page's worth of sheet, which fills the height it is pulled to. */
  large: boolean;
  style?: StyleProp<ViewStyle>;
  /** The opener's `bottomGap`: room past the home indicator, or past the
   * keyboard while it's up. */
  bottomGap?: number;
  /** Set when the opener closed the sheet itself, so the page going away
   * isn't reported back to it as a swipe-down. */
  closedByOwner?: boolean;
}

const entries = new Map<string, SheetEntry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const sheetPortal = {
  get: (id: string) => entries.get(id),
  set(id: string, entry: SheetEntry) {
    entries.set(id, entry);
    emit();
  },
  markClosed(id: string) {
    const entry = entries.get(id);
    if (entry) entry.closedByOwner = true;
  },
  remove(id: string) {
    entries.delete(id);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
