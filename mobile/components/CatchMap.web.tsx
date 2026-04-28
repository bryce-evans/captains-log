import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../theme';

export default function CatchMap() {
  return (
    <SafeAreaView style={styles.center} edges={['bottom']}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Map view</Text>
      <Text style={styles.sub}>Available in the native app</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.textMuted },
  sub: { fontFamily: Fonts.body, fontSize: 15, color: Colors.textMuted, marginTop: 6 },
});
