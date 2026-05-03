import { Stack } from 'expo-router';

/**
 * Stack inside the Logbook tab so we can route to a record detail view at
 * `/logbook/[id]`. Both screens own their own header treatment via the
 * Surface primitive — we hide the platform header here.
 */
export default function LogbookLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
