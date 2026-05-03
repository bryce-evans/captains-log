import { validateSql } from '../sqlGuard';

describe('validateSql', () => {
  it('accepts a simple SELECT against records', () => {
    const result = validateSql('SELECT * FROM records');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sql).toBe('SELECT * FROM records');
    }
  });

  it('accepts a CTE with WITH ... SELECT referencing records', () => {
    const sql =
      "WITH recent AS (SELECT id, schema_id FROM records WHERE schema_id = 'mvp.fishing') " +
      'SELECT COUNT(*) FROM recent';
    const result = validateSql(sql);
    expect(result.ok).toBe(true);
  });

  it('accepts a SELECT with a single trailing semicolon (which is stripped)', () => {
    const result = validateSql('SELECT 1 FROM records;');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sql.endsWith(';')).toBe(false);
    }
  });

  it('rejects DROP TABLE', () => {
    const result = validateSql('DROP TABLE records');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/select|drop/i);
    }
  });

  it('rejects INSERT', () => {
    const result = validateSql("INSERT INTO records (id) VALUES ('x')");
    expect(result.ok).toBe(false);
  });

  it('rejects UPDATE', () => {
    const result = validateSql("UPDATE records SET fields_json = '{}'");
    expect(result.ok).toBe(false);
  });

  it('rejects multiple statements', () => {
    const result = validateSql('SELECT 1 FROM records; SELECT 2 FROM records');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/multiple/i);
    }
  });

  it('rejects line comments', () => {
    const result = validateSql('SELECT 1 FROM records -- comment');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/comment/i);
    }
  });

  it('rejects block comments', () => {
    const result = validateSql('SELECT /* hi */ 1 FROM records');
    expect(result.ok).toBe(false);
  });

  it('rejects PRAGMA statements', () => {
    const result = validateSql('PRAGMA table_info(records)');
    expect(result.ok).toBe(false);
  });

  it('rejects queries against non-allowed tables', () => {
    const result = validateSql('SELECT * FROM users');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/disallowed table/i);
    }
  });

  it('rejects empty input', () => {
    const result = validateSql('   ');
    expect(result.ok).toBe(false);
  });

  it('rejects UNION used to read other tables', () => {
    const result = validateSql('SELECT 1 FROM records UNION SELECT name FROM sqlite_master');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/forbidden keyword/i);
    }
  });

  it('rejects INTERSECT', () => {
    const result = validateSql('SELECT id FROM records INTERSECT SELECT id FROM schemas');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/intersect/i);
    }
  });

  it('rejects EXCEPT', () => {
    const result = validateSql('SELECT id FROM records EXCEPT SELECT id FROM schemas');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/except/i);
    }
  });

  it('rejects subquery in FROM', () => {
    const result = validateSql('SELECT * FROM (SELECT id FROM records) AS r');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/subqueries/i);
    }
  });

  it('rejects subquery in WHERE', () => {
    const result = validateSql(
      'SELECT * FROM records WHERE id IN (SELECT id FROM records WHERE id = 1)',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/subqueries/i);
    }
  });

  it('rejects sqlite_master access', () => {
    const result = validateSql('SELECT name FROM sqlite_master');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/sqlite_master/i);
    }
  });

  it('rejects sqlite_sequence access', () => {
    const result = validateSql('SELECT seq FROM sqlite_sequence');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/sqlite_sequence/i);
    }
  });

  it('rejects sqlite_schema access', () => {
    const result = validateSql('SELECT name FROM sqlite_schema');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/sqlite_schema/i);
    }
  });

  it('rejects line comments using --', () => {
    const result = validateSql('SELECT * FROM records -- malicious');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/comment/i);
    }
  });

  it('rejects block comments using /* */', () => {
    const result = validateSql('SELECT /* comment */ * FROM records');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/comment/i);
    }
  });
});
