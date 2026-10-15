import { Ionicons } from '@expo/vector-icons';
import { Button, ContextMenu, Host, RNHostView } from '@expo/ui/swift-ui';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { sfSymbolFor } from '@/constants/symbols';
import { NATIVE_HEADER } from './Screen';

export interface MenuAction {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** In the system red, for the choice that can't be taken back. */
  destructive?: boolean;
  onPress: () => void;
}

export interface LongPressMenuProps {
  actions: readonly MenuAction[];
  children: React.ReactElement;
  style?: StyleProp<ViewStyle>;
}

/**
 * Press and hold for the iPhone's own context menu: the thing held lifts out
 * of the blurred page with its choices under it, the way a message or a photo
 * does anywhere on the phone. A tap still goes to whatever was tapped.
 * Elsewhere — and with nothing to offer — it is just its contents.
 *
 * The contents are hosted inside the system menu's view, which sizes them to
 * what they measure; so the width they'd have had on the page is measured
 * first and handed to them, or a full-width row would shrink to its text.
 */
export function LongPressMenu({ actions, children, style }: LongPressMenuProps) {
  const [width, setWidth] = useState(0);

  if (!NATIVE_HEADER || actions.length === 0) return <View style={style}>{children}</View>;

  return (
    <View
      style={style}
      onLayout={(e) => {
        const next = Math.round(e.nativeEvent.layout.width);
        if (next !== width) setWidth(next);
      }}
    >
      {width ? (
        <Host matchContents>
          <ContextMenu>
            <ContextMenu.Items>
              {actions.map((action) => (
                <Button
                  key={action.label}
                  label={action.label}
                  systemImage={action.icon ? sfSymbolFor(action.icon) : undefined}
                  role={action.destructive ? 'destructive' : undefined}
                  onPress={action.onPress}
                />
              ))}
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <RNHostView matchContents>
                <View style={{ width }}>{children}</View>
              </RNHostView>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      ) : (
        children
      )}
    </View>
  );
}

export default LongPressMenu;
