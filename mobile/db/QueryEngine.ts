import { Platform } from 'react-native';
import { getDb } from './client';

type Matcher = {
  keywords: string[];
  run: (lower: string) => Promise<string>;
};

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

async function totalSales(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; count: number }>(
    `SELECT SUM(CAST(rf.field_value AS REAL)) AS total, COUNT(*) AS count
     FROM records r
     JOIN record_fields rf ON rf.record_id = r.id AND rf.field_key = 'price'
     WHERE r.schema_id = 'art_sale'`
  );
  if (!row || row.count === 0) return 'No art sale records found yet.';
  return `Total sales: $${row.total.toFixed(2)} across ${row.count} item${row.count === 1 ? '' : 's'}.`;
}

async function biggestSale(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ item: string; price: string; created_at: string }>(
    `SELECT rf_i.field_value AS item,
            rf_p.field_value AS price,
            r.created_at
     FROM records r
     JOIN record_fields rf_p ON rf_p.record_id = r.id AND rf_p.field_key = 'price'
     JOIN record_fields rf_i ON rf_i.record_id = r.id AND rf_i.field_key = 'item'
     WHERE r.schema_id = 'art_sale'
     ORDER BY CAST(rf_p.field_value AS REAL) DESC
     LIMIT 1`
  );
  if (!row) return 'No art sale records found yet.';
  return `Your biggest sale was "${row.item}" for $${row.price} on ${fmt(row.created_at)}.`;
}

async function countAll(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM records`
  );
  return `You have ${row?.count ?? 0} total records.`;
}

const MATCHERS: Matcher[] = [
  {
    keywords: ['biggest', 'largest', 'heaviest', 'biggest fish'],
    run: () => biggest(),
  },
  {
    keywords: ['perch'],
    run: () => countSpecies('perch'),
  },
  {
    keywords: ['bass'],
    run: () => countSpecies('bass'),
  },
  {
    keywords: ['trout'],
    run: () => countSpecies('trout'),
  },
  {
    keywords: ['how many fish', 'fish caught', 'total fish', 'how many caught'],
    run: () => countFishing(),
  },
  {
    keywords: ['total sale', 'how much', 'revenue', 'made'],
    run: () => totalSales(),
  },
  {
    keywords: ['biggest sale', 'most expensive', 'highest price'],
    run: () => biggestSale(),
  },
  {
    keywords: ['last', 'recent', 'latest'],
    run: () => lastRecord(),
  },
  {
    keywords: ['how many', 'count', 'total'],
    run: () => countAll(),
  },
];

// Web fallback — SQLite not available
const WEB_ANSWERS: { keywords: string[]; answer: string }[] = [
  { keywords: ['biggest', 'largest', 'heaviest'], answer: 'Your biggest catch was a Largemouth Bass weighing 4.2 lbs, caught on April 26 at Lake Cayuga.' },
  { keywords: ['perch'], answer: "You've caught 2 perch." },
  { keywords: ['last', 'recent'], answer: 'Your last record was a Largemouth Bass catch on April 26.' },
  { keywords: ['sale', 'sold', 'total'], answer: 'Total sales: $250.00 across 3 items.' },
];

export const QueryEngine = {
  async run(question: string): Promise<string> {
    const lower = question.toLowerCase();

    if (Platform.OS === 'web') {
      for (const { keywords, answer } of WEB_ANSWERS) {
        if (keywords.some((k) => lower.includes(k))) return answer;
      }
      return `Searched your records for: "${question}". (Live SQL queries require the native app.)`;
    }

    for (const matcher of MATCHERS) {
      if (matcher.keywords.some((k) => lower.includes(k))) {
        return matcher.run(lower);
      }
    }

    // Generic fallback: count total records
    return countAll().then((s) => `${s} Try asking about a specific species, sale, or date.`);
  },
};
