import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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
          tabBarButton: () => <TabFab onPress={() => router.push('/chat')} />,
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
