import { StyleSheet, View } from 'react-native';

import { MicroCaps } from '@/components/type';
import { color, space } from '@/styles/tokens';

interface Props {
  label: string;
}

/**
 * The "─── April 2026 ───" date header used between months on the Albums
 * screen. Mist hairlines flank a centered MicroCaps label, with a `breath`
 * margin above to give each new month a real moment of air.
 */
export function AlbumGroupHeader({ label }: Props) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <View style={styles.rule} />
      <MicroCaps style={styles.label}>{label}</MicroCaps>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.breath,
    marginBottom: space.lg,
    gap: space.md,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: color.mist,
  },
  label: {
    color: color.inkSoft,
  },
});
