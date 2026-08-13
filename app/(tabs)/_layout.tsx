import { Tabs, useRouter } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { TabFab } from '@/components/tab-fab';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
          backgroundColor: tokens.ink900,
          borderTopColor: tokens.ink700,
        },
        tabBarLabelStyle: { fontSize: 10 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: 'Disputes',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="exclamationmark.triangle.fill" color={color} />
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
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="ellipsis" color={color} />,
        }}
      />
    </Tabs>
  );
}
