// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Zoey app additions.
  'bubble.left.fill': 'chat-bubble',
  'bell.fill': 'notifications',
  // Outline variants -- the header glyphs are stroked, not solid.
  'ellipsis.bubble': 'chat-bubble-outline',
  bell: 'notifications-none',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'person.text.rectangle': 'contact-page',
  // More section.
  gearshape: 'settings',
  // Recovery entry in More: connecting an existing Pinnacle file to this sign-in.
  link: 'link',
  'creditcard.fill': 'credit-card',
  target: 'my-location',
  'chart.bar.fill': 'bar-chart',
  // Credit Score tab: a gauge reads as a score dial rather than as analytics.
  'gauge.with.needle': 'speed',
  'person.crop.circle': 'account-circle',
  'lock.fill': 'lock',
  'hand.raised.fill': 'privacy-tip',
  'rectangle.portrait.and.arrow.right': 'logout',
  trash: 'delete-outline',
  'checkmark.circle': 'check-circle-outline',
  // Legal & Privacy: a neutral notice glyph. Deliberately not the warning triangle -- a document
  // still in draft is information, not an alarm.
  'info.circle': 'info-outline',
  'plus.circle.fill': 'add-circle',
  plus: 'add',
  'exclamationmark.triangle.fill': 'report-problem',
  'doc.text.fill': 'description',
  'arrow.up.doc.fill': 'file-upload',
  ellipsis: 'more-horiz',
  sparkles: 'auto-awesome',
  'icloud.and.arrow.up': 'cloud-upload',
  'checkmark.circle.fill': 'check-circle',
  'doc.fill': 'insert-drive-file',
  'folder.fill': 'folder',
  // Report-factor rows on the credit screens.
  'clock.fill': 'schedule',
  'flag.fill': 'flag',
  'xmark.circle.fill': 'cancel',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
