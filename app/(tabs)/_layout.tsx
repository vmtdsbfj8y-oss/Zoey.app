import { useI18n } from '@/lib/i18n/context';
import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { TabFab } from '@/components/tab-fab';
import { GlowIcon } from '@/components/ui/glow-icon';
import { tokens } from '@/constants/tokens';
import { useMembership } from '@/lib/membership-context';

export default function TabLayout() {
  const { t } = useI18n();
  const router = useRouter();
  // The premium START ZOEY experience is a member feature; the badge says so.
  const { isPremium, loading: membershipLoading } = useMembership();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: tokens.violet400,
        tabBarInactiveTintColor: 'rgba(244,239,255,0.42)',
        // Frosted: the bar floats over the screen so the backdrop and orbs
        // are behind it to blur. Screens add bottom padding to compensate.
        // The dark plate keeps it near-black like the page ends, rather than
        // the violet slab a heavier tint produced.
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9,5,20,0.72)' }]} />
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(244,239,255,0.07)',
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'IBMPlexSans_500Medium' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="house.fill" color={color} focused={focused} id="tabHome" />
          ),
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: t('tabs.disputes'),
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon
              name="exclamationmark.triangle.fill"
              color={color}
              focused={focused}
              id="tabDisputes"
            />
          ),
        }}
      />
      {/*
        Phantom slot. It exists only so the tab bar reserves a center cell for
        the FAB -- with 4 real tabs the FAB would otherwise straddle the
        Disputes/Credit Score boundary. The custom tabBarButton never calls the
        navigator's onPress, so this route is never actually visited.

        The FAB is RUN ZOEY. It routes to the Documents screen because that is
        where the Run Zoey experience lives -- the hero, the lifecycle states and
        the locked card are all already there. Routing to it rather than
        reimplementing it is also what keeps membership gating intact: the
        destination reads `useMembership()` and decides, exactly as it did when
        the same screen was a tab.

        `locked` is passed for the badge only. It cannot suppress the press.
      */}
      <Tabs.Screen
        name="new"
        options={{
          title: '',
          tabBarButton: () => (
            <TabFab
              locked={!membershipLoading && !isPremium}
              onPress={() => router.push('/documents')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="credit-score"
        options={{
          title: t('tabs.creditScore'),
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="gauge.with.needle" color={color} focused={focused} id="tabScore" />
          ),
        }}
      />
      {/*
        Documents keeps its route and its screen; it just leaves the bar.
        `href: null` is expo-router's own way to say that -- the route stays
        navigable from More and from the Run Zoey button, and only its tab item
        is hidden. Deleting the screen would have taken the Run Zoey experience
        with it.

        It cannot be combined with `tabBarButton` (expo-router throws), which is
        why the phantom slot above still uses the button form.
      */}
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="ellipsis" color={color} focused={focused} id="tabMore" />
          ),
        }}
      />
    </Tabs>
  );
}
