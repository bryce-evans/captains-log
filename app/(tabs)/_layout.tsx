import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="logbook" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask' }} />
    </Tabs>
  );
}
