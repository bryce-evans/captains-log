import { getDb } from './client';
import { RecordRepository } from './RecordRepository';
import { FISHING_SCHEMA } from '../store';

// Test records inserted on first native launch when the DB is empty.
// Re-run by deleting the app (clears SQLite) or calling seedTestData() directly.
const TEST_RECORDS = [
  {
    id: 'seed-1',
    schemaId: 'fishing', schemaName: 'Fishing Catch', schemaEmoji: '🎣',
    createdAt: '2026-04-26T14:32:00Z',
    fields: { species: 'Largemouth Bass', weight_lbs: '4.2', length_in: '18', lure: 'Plastic Worm', location: 'Lake Cayuga', weather: 'Partly cloudy, 68°F' },
  },
  {
    id: 'seed-2',
    schemaId: 'fishing', schemaName: 'Fishing Catch', schemaEmoji: '🎣',
    createdAt: '2026-04-25T09:15:00Z',
    fields: { species: 'Yellow Perch', weight_lbs: '0.8', length_in: '10', lure: 'Minnow', location: 'Lake Cayuga', weather: 'Sunny, 61°F' },
  },
  {
    id: 'seed-3',
    schemaId: 'fishing', schemaName: 'Fishing Catch', schemaEmoji: '🎣',
    createdAt: '2026-04-24T07:45:00Z',
    fields: { species: 'Smallmouth Bass', weight_lbs: '3.1', length_in: '16', lure: 'Jig', location: 'Seneca Lake', weather: 'Overcast, 64°F' },
  },
  {
    id: 'seed-4',
    schemaId: 'fishing', schemaName: 'Fishing Catch', schemaEmoji: '🎣',
    createdAt: '2026-04-23T11:00:00Z',
    fields: { species: 'Brown Trout', weight_lbs: '5.6', length_in: '22', lure: 'Spinner', location: 'Cayuga Inlet', weather: 'Clear, 58°F', notes: 'Personal best' },
  },
  {
    id: 'seed-5',
    schemaId: 'fishing', schemaName: 'Fishing Catch', schemaEmoji: '🎣',
    createdAt: '2026-04-22T08:30:00Z',
    fields: { species: 'Yellow Perch', weight_lbs: '1.1', length_in: '12', lure: 'Small Jig', location: 'Lake Cayuga', weather: 'Sunny, 62°F' },
  },
];

export async function seedTestData(): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM records');
  if ((existing?.count ?? 0) > 0) return; // already seeded

  // Values embedded in TEST_RECORDS; schemaMap used by RecordRepository on reads
  void FISHING_SCHEMA;

  for (const record of TEST_RECORDS) {
    await RecordRepository.insert(record);
  }
  console.log(`[db] seeded ${TEST_RECORDS.length} test records`);
}
