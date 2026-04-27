import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUILT_IN_QUERIES, QueryEngine } from '../../db/QueryEngine';
import { Colors, Fonts } from '../../theme';

const CATEGORIES = Array.from(new Set(BUILT_IN_QUERIES.map((q) => q.category)));

export default function AskScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const runQuery = async (id: string) => {
    setActiveId(id);
    setLoading(true);
    setAnswer(null);
    try {
      const result = await QueryEngine.runById(id);
      setAnswer(result);
    } finally {
      setLoading(false);
    }
  };

  const activeLabel = BUILT_IN_QUERIES.find((q) => q.id === activeId)?.label;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Result card */}
        {(loading || answer) && (
          <Surface style={styles.resultCard} elevation={2}>
            {activeLabel && (
              <Text style={styles.resultLabel}>{activeLabel}</Text>
            )}
            {loading
              ? <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Querying records…</Text>
                </View>
              : <Text style={styles.resultText}>{answer}</Text>
            }
          </Surface>
        )}

        {/* Query groups */}
        {CATEGORIES.map((category) => (
          <View key={category} style={styles.group}>
            <Text style={styles.groupLabel}>{category}</Text>
            <Surface style={styles.groupCard} elevation={1}>
              {BUILT_IN_QUERIES
                .filter((q) => q.category === category)
                .map((q, idx, arr) => (
                  <React.Fragment key={q.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.queryRow,
                        activeId === q.id && styles.queryRowActive,
                        pressed && styles.queryRowPressed,
                      ]}
                      onPress={() => runQuery(q.id)}
                    >
                      <Text style={[
                        styles.queryLabel,
                        activeId === q.id && styles.queryLabelActive,
                      ]}>
                        {q.label}
                      </Text>
                      <Text style={styles.queryChevron}>›</Text>
                    </Pressable>
                    {idx < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
            </Surface>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  scroll: { padding: 20, paddingBottom: 40 },

  resultCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: Colors.primaryLight,
    marginBottom: 24,
  },
  resultLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  resultText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: Fonts.body, color: Colors.textMuted },

  group: { marginBottom: 24 },
  groupLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },

  queryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  queryRowActive: { backgroundColor: Colors.primaryLight },
  queryRowPressed: { backgroundColor: Colors.paperDark },
  queryLabel: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  queryLabelActive: { fontFamily: Fonts.bodyBold, color: Colors.primary },
  queryChevron: { fontSize: 20, color: Colors.textMuted, lineHeight: 22 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.paperDark, marginLeft: 20 },
});
