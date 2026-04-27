import { Platform } from 'react-native';
import { getDb } from './client';

export interface BuiltInQuery {
  id: string;
  label: string;
  category: string;
  run: () => Promise<string>;
  webFallback: string;
}

function fmt(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

async function biggest(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ species: string; weight: string; created_at: string }>(
    `SELECT rf_s.field_value AS species,
            rf_w.field_value AS weight,
            r.created_at
     FROM records r
     JOIN record_fields rf_w ON rf_w.record_id = r.id AND rf_w.field_key = 'weight_lbs'
     JOIN record_fields rf_s ON rf_s.record_id = r.id AND rf_s.field_key = 'species'
     WHERE r.schema_id = 'fishing'
     ORDER BY CAST(rf_w.field_value AS REAL) DESC
     LIMIT 1`
  );
  if (!row) return 'No fishing records found yet.';
  return `Your biggest catch was a ${row.species} weighing ${row.weight} lbs, logged on ${fmt(row.created_at)}.`;
}

async function countSpecies(species: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM records r
     JOIN record_fields rf ON rf.record_id = r.id AND rf.field_key = 'species'
     WHERE LOWER(rf.field_value) LIKE ?`,
    [`%${species}%`]
  );
  const n = row?.count ?? 0;
  const label = species.charAt(0).toUpperCase() + species.slice(1);
  return n === 0
    ? `No ${label} records found.`
    : `You've caught ${n} ${label}${n === 1 ? '' : 's'}.`;
}

async function countFishing(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM records WHERE schema_id = 'fishing'`
  );
  const n = row?.count ?? 0;
  return `You have ${n} fishing record${n === 1 ? '' : 's'} logged.`;
}

async function lastRecord(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ schema_id: string; created_at: string; id: string }>(
    `SELECT schema_id, created_at, id FROM records ORDER BY created_at DESC LIMIT 1`
  );
  if (!row) return 'No records found yet.';
  const fieldRow = await db.getFirstAsync<{ field_value: string }>(
    `SELECT field_value FROM record_fields WHERE record_id = ? ORDER BY id LIMIT 1`,
    [row.id]
  );
  const label = fieldRow?.field_value ?? row.schema_id;
  return `Your last record was "${label}" logged on ${fmt(row.created_at)}.`;
}

async function countAll(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM records`
  );
  return `You have ${row?.count ?? 0} total records.`;
}

export const BUILT_IN_QUERIES: BuiltInQuery[] = [
  {
    id: 'biggest_fish',
    label: 'Biggest catch',
    category: 'Fishing 🎣',
    run: biggest,
    webFallback: 'Your biggest catch was a Largemouth Bass weighing 4.2 lbs on April 26.',
  },
  {
    id: 'count_fishing',
    label: 'Total fish logged',
    category: 'Fishing 🎣',
    run: countFishing,
    webFallback: 'You have 2 fishing records logged.',
  },
  {
    id: 'count_bass',
    label: 'Bass caught',
    category: 'Fishing 🎣',
    run: () => countSpecies('bass'),
    webFallback: "You've caught 1 Bass.",
  },
  {
    id: 'count_perch',
    label: 'Perch caught',
    category: 'Fishing 🎣',
    run: () => countSpecies('perch'),
    webFallback: "You've caught 1 Perch.",
  },
  {
    id: 'count_trout',
    label: 'Trout caught',
    category: 'Fishing 🎣',
    run: () => countSpecies('trout'),
    webFallback: 'No Trout records found.',
  },
  {
    id: 'last_record',
    label: 'Last record logged',
    category: 'All Records',
    run: lastRecord,
    webFallback: 'Your last record was a Largemouth Bass catch on April 26.',
  },
  {
    id: 'count_all',
    label: 'Total records',
    category: 'All Records',
    run: countAll,
    webFallback: 'You have 3 total records.',
  },
];

export const QueryEngine = {
  async runById(id: string): Promise<string> {
    const query = BUILT_IN_QUERIES.find((q) => q.id === id);
    if (!query) return 'Query not found.';
    if (Platform.OS === 'web') return query.webFallback;
    return query.run();
  },
};
