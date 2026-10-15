import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/SettingsList';
import { APPEARANCE_CHOICES, setAppearance, useAppearance } from '@/lib/appearance';

/** Each theme choice's glyph. */
const THEME_ICONS = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
} as const;

/**
 * Light, dark, or the phone's own setting, opened from Settings' Theme row:
 * three rows with a tick on the one in force, the way the Settings app lists
 * a choice on a page of its own. One tap changes it, and the whole app
 * follows straight away.
 */
export default function ThemeScreen() {
  const choice = useAppearance();
  useFreshScreensBehind();
  return (
    <SettingsList header={<ScreenHeader plainTitle="Theme" />}>
      <SettingsGroup title="Theme">
        {APPEARANCE_CHOICES.map((c, i) => (
          <SettingsRow
            key={c.key}
            icon={THEME_ICONS[c.key]}
            label={c.label}
            checked={c.key === choice}
            onPress={() => setAppearance(c.key)}
            last={i === APPEARANCE_CHOICES.length - 1}
          />
        ))}
      </SettingsGroup>
    </SettingsList>
  );
}

type RouteLike = { key?: string; state?: StateLike; [field: string]: unknown };
type StateLike = { index?: number; routes: RouteLike[]; [field: string]: unknown };

/** A route as it was, but without its keys, so the navigator makes it — and
 * every navigator inside it — afresh, still on the same tab and page. */
const freshRoute = ({ key: _key, state, ...route }: RouteLike): RouteLike =>
  state ? { ...route, state: { index: state.index, routes: state.routes.map(freshRoute) } } : route;

/**
 * Everything under this page — Settings, the tabs, their bars — is out of
 * sight while the theme changes, and the iPhone only redraws a hidden page
 * as it comes back, so its glass visibly turned from the old appearance to
 * the new one on the way back. So once the appearance changes, those pages
 * are made again, out of sight and already in the new one; this page keeps
 * its own key and stays exactly as it is.
 */
function useFreshScreensBehind() {
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const shown = useRef(scheme);

  useEffect(() => {
    if (shown.current === scheme) return;
    shown.current = scheme;
    const state = navigation.getState() as unknown as StateLike | undefined;
    if (!state) return;
    const here = state.index ?? state.routes.length - 1;
    navigation.reset({
      index: here,
      routes: state.routes.map((route, i) => (i === here ? route : freshRoute(route))),
    } as never);
  }, [navigation, scheme]);
}
