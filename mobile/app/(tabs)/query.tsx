import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';

const MOCK_ANSWERS: { [q: string]: string } = {
  default: 'I searched your records and found: ',
  fish: 'Your biggest fish was a Largemouth Bass weighing 4.2 lbs, caught on April 26 at Lake Cayuga.',
  perch: 'You\'ve caught 1 perch — a Yellow Perch weighing 0.8 lbs on April 25.',
  last: 'Your last record was a Largemouth Bass catch on April 26 at 2:32 PM.',
  sale: 'Your most recent sale was "Watercolor landscape #7" for $120 via Venmo on April 20.',
};

function getAnswer(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes('perch')) return MOCK_ANSWERS.perch;
  if (lower.includes('biggest') || lower.includes('largest') || lower.includes('heaviest')) return MOCK_ANSWERS.fish;
  if (lower.includes('last')) return MOCK_ANSWERS.last;
  if (lower.includes('sale') || lower.includes('sold')) return MOCK_ANSWERS.sale;
  return `Based on your records: I found ${Math.floor(Math.random() * 5) + 1} relevant entries matching "${q}". The most recent was on April 26.`;
}

export default function QueryScreen() {
  const activeSchema = useStore((s) => s.activeSchema);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const handleAsk = () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setTimeout(() => {
      setAnswer(getAnswer(question));
      setLoading(false);
    }, 1200);
  };

  const suggestions = [
    'What was my biggest fish?',
    'How many perch did I catch?',
    'What was my last record?',
    'Show me all sales over $100',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="bodyMedium" style={styles.context}>
          Querying: {activeSchema.emoji} {activeSchema.name}
        </Text>

        <TextInput
          mode="outlined"
          label="Ask a question about your records…"
          value={question}
          onChangeText={setQuestion}
          multiline
          style={styles.input}
          right={<TextInput.Icon icon="microphone" onPress={() => setQuestion('What was my biggest fish?')} />}
          onSubmitEditing={handleAsk}
          returnKeyType="search"
        />

        <Button
          mode="contained"
          onPress={handleAsk}
          style={styles.askBtn}
          contentStyle={styles.askBtnContent}
          disabled={!question.trim() || loading}
        >
          Ask
        </Button>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#1B5E20" />
            <Text style={styles.loadingText}>Searching your records…</Text>
          </View>
        )}

        {answer && !loading && (
          <Surface style={styles.answerCard} elevation={2}>
            <Text style={styles.answerLabel}>Answer</Text>
            <Text style={styles.answerText}>{answer}</Text>
          </Surface>
        )}

        {!answer && !loading && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestLabel}>Try asking:</Text>
            {suggestions.map((s) => (
              <Button
                key={s}
                mode="text"
                compact
                onPress={() => setQuestion(s)}
                style={styles.suggestion}
                labelStyle={styles.suggestionLabel}
              >
                {s}
              </Button>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 20, flexGrow: 1 },
  context: { color: '#888', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#fff', marginBottom: 12 },
  askBtn: { marginBottom: 24 },
  askBtnContent: { paddingVertical: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { color: '#555' },
  answerCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#E8F5E9',
  },
  answerLabel: { fontWeight: '700', color: '#2E7D32', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  answerText: { fontSize: 16, color: '#1a1a1a', lineHeight: 24 },
  suggestions: { marginTop: 8 },
  suggestLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  suggestion: { alignSelf: 'flex-start', marginBottom: 4 },
  suggestionLabel: { color: '#2E7D32', textAlign: 'left' },
});
