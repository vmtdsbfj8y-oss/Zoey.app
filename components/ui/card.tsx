import { View, type ViewProps } from 'react-native';

/** Base surface. 16px padding (`p-4`); denser inner tiles drop to 12 (`p-3`). */
export function Card({ className, ...rest }: ViewProps) {
  return (
    <View
      className={`rounded-card border border-ink-700 bg-ink-900 p-4 ${className ?? ''}`}
      {...rest}
    />
  );
}
