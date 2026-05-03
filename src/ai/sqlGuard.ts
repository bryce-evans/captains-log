/**
 * Validates that a generated SQL query is safe to execute against the local
 * SQLite database. Read-only, single-statement, no comments, only touches
 * the `records` and `schemas` tables.
 *
 * The guard is intentionally conservative — anything ambiguous is rejected
 * with a reason so the caller can surface a clear error to the user.
 */

export type SqlGuardResult =
  | { readonly ok: true; readonly sql: string }
  | { readonly ok: false; readonly reason: string };

const ALLOWED_TABLES = ['records', 'schemas'] as const;

const FORBIDDEN_KEYWORDS: ReadonlyArray<string> = [
  'insert',
  'update',
  'delete',
  'drop',
  'create',
  'alter',
  'truncate',
  'replace',
  'merge',
  'pragma',
  'attach',
  'detach',
  'vacuum',
  'reindex',
  'analyze',
  'grant',
  'revoke',
  // Set operations open up arbitrary table targets through the second SELECT.
  'union',
  'intersect',
  'except',
  // SQLite metadata tables expose schema and rowid sequences. Block by name.
  'sqlite_master',
  'sqlite_sequence',
  'sqlite_schema',
  'sqlite_temp_master',
];

function stripTrailingSemicolon(sql: string): string {
  return sql.replace(/;\s*$/, '');
}

/**
 * Detects a parenthesised SELECT that is NOT introduced by `AS` — i.e. a
 * subquery in FROM / WHERE / SELECT-list. CTE definitions (`WITH x AS
 * (SELECT ...)`) use `AS` and are explicitly excluded.
 */
function hasSubquerySelect(sql: string): boolean {
  const pattern = /\(\s*select\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    // Look at characters immediately before the `(` to decide whether this is
    // a CTE definition (`AS (SELECT ...)`) or a subquery somewhere else.
    const before = sql.slice(0, match.index).trimEnd().toLowerCase();
    if (/\bas$/.test(before)) {
      continue;
    }
    return true;
  }
  return false;
}

function hasComment(sql: string): boolean {
  // Block both `--` line comments and `/* ... */` block comments
  return /--/.test(sql) || /\/\*/.test(sql) || /\*\//.test(sql);
}

function hasMultipleStatements(sql: string): boolean {
  // After stripping the optional trailing semicolon, no `;` should remain
  return sql.includes(';');
}

function tokenize(sql: string): readonly string[] {
  return sql
    .toLowerCase()
    .replace(/[(),]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function startsWithSelectOrWith(tokens: readonly string[]): boolean {
  const first = tokens[0];
  return first === 'select' || first === 'with';
}

function findForbiddenKeyword(tokens: readonly string[]): string | null {
  for (const token of tokens) {
    if (FORBIDDEN_KEYWORDS.includes(token)) {
      return token;
    }
  }
  return null;
}

function findDisallowedTable(sql: string): string | null {
  // Match identifiers after FROM or JOIN. Strip simple alias forms.
  const pattern = /\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  const allowed: ReadonlyArray<string> = ALLOWED_TABLES;
  while ((match = pattern.exec(sql)) !== null) {
    const table = match[1];
    if (table && !allowed.includes(table.toLowerCase() as (typeof ALLOWED_TABLES)[number])) {
      // CTE references are tolerated when WITH defines them; check for prior
      // `with <name>` definition.
      const ctePattern = new RegExp(`\\bwith\\s+${table}\\b`, 'i');
      if (!ctePattern.test(sql)) {
        return table;
      }
    }
  }
  return null;
}

export function validateSql(rawSql: string): SqlGuardResult {
  if (typeof rawSql !== 'string') {
    return { ok: false, reason: 'sql is not a string' };
  }
  const trimmed = rawSql.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty sql' };
  }

  if (hasComment(trimmed)) {
    return { ok: false, reason: 'comments are not allowed' };
  }

  const stripped = stripTrailingSemicolon(trimmed);

  if (hasMultipleStatements(stripped)) {
    return { ok: false, reason: 'multiple statements are not allowed' };
  }

  const tokens = tokenize(stripped);
  if (tokens.length === 0) {
    return { ok: false, reason: 'empty statement' };
  }

  if (!startsWithSelectOrWith(tokens)) {
    return { ok: false, reason: 'only SELECT or WITH...SELECT statements are allowed' };
  }

  // For WITH clauses, ensure the body still contains a SELECT
  if (tokens[0] === 'with' && !tokens.includes('select')) {
    return { ok: false, reason: 'WITH must contain a SELECT' };
  }

  const forbidden = findForbiddenKeyword(tokens);
  if (forbidden) {
    return { ok: false, reason: `forbidden keyword: ${forbidden}` };
  }

  if (hasSubquerySelect(stripped)) {
    return { ok: false, reason: 'subqueries are not allowed' };
  }

  const disallowedTable = findDisallowedTable(stripped);
  if (disallowedTable) {
    return { ok: false, reason: `disallowed table: ${disallowedTable}` };
  }

  return { ok: true, sql: stripped };
}
