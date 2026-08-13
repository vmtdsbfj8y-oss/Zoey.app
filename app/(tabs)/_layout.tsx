import { Tabs, useRouter } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { TabFab } from '@/components/tab-fab';
import { GlowIcon } from '@/components/ui/glow-icon';
import { tokens } from '@/constants/tokens';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: tokens.violet500,
        tabBarInactiveTintColor: tokens.ink600,
        tabBarStyle: {
          backgroundColor: 'rgba(19,10,36,0.92)',
          borderTopColor: tokens.ink700,
        },
        tabBarLabelStyle: { fontSize: 10 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="house.fill" color={color} focused={focused} id="tabHome" />
          ),
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: 'Disputes',
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
        Disputes/Documents boundary. The custom tabBarButton never calls the
        navigator's onPress, so this route is never actually visited.
      */}
      <Tabs.Screen
        name="new"
        options={{
          title: '',
          tabBarButton: () => <TabFab onPress={() => router.push('/upload')} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="doc.text.fill" color={color} focused={focused} id="tabDocs" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <GlowIcon name="ellipsis" color={color} focused={focused} id="tabMore" />
          ),
        }}
      />
    </Tabs>
  );
}
