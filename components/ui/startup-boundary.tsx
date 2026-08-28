import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tokens } from '@/constants/tokens';
import { tr } from '@/lib/i18n/runtime';

/**
 * The last thing between a render-time throw and a dead launch screen.
 *
 * ==============================  WHY IT SITS OUTSIDE EVERYTHING  ==============================
 *
 * It wraps the providers rather than living under them, because the failures worth catching happen
 * exactly where a provider is being constructed -- a session restore, a store, a screen mounted by
 * the navigator. A boundary underneath those cannot catch the throw that took them down.
 *
 * That placement is also why the copy comes from `tr()` and not `useI18n()`: this component must
 * render even when the i18n provider is one of the things that failed. `tr` is the non-reactive
 * mirror and needs no context.
 *
 * ==============================  IT HIDES THE SPLASH ITSELF  ==============================
 *
 * `onError` fires from `componentDidCatch`, which runs on the commit path even though the render
 * effects below never will. That is the whole point: the root layout's "hide the splash" effect is
 * unreachable once the tree has thrown, so the boundary reports the failure and the splash is hidden
 * from there instead. Never let the only path that hides the splash be one a crash can skip.
 */
export class StartupBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void; onRetry: () => void; hasError: boolean },
  { message: string | null }
> {
  state = { message: null as string | null };

  componentDidCatch(error: Error) {
    this.setState({ message: error?.message ?? null });
    // Reported upward so the splash is hidden even though no effect below will run.
    this.props.onError(error);
  }

  render() {
    if (!this.props.hasError) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center gap-3 px-8" style={{ backgroundColor: tokens.ink950 }}>
        <Text className="text-center font-display text-[18px]" style={{ color: tokens.parchment }}>
          {tr('startup.errorTitle')}
        </Text>
        <Text className="text-center font-sans text-[13px] leading-[19px]" style={{ color: 'rgba(244,239,255,0.6)' }}>
          {tr('startup.errorBody')}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('startup.retry')}
          onPress={() => {
            this.setState({ message: null });
            this.props.onRetry();
          }}
          // 44pt minimum: on this screen it is the only control that exists.
          style={{ minHeight: 44, backgroundColor: tokens.violet500 }}
          className="mt-2 items-center justify-center rounded-full px-8 active:opacity-85"
        >
          <Text className="font-sans-semibold text-[13px] tracking-[0.06em]" style={{ color: tokens.parchment }}>
            {tr('startup.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }
}
