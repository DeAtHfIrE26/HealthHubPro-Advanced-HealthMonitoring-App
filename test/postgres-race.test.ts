/**
 * Cold-start concurrency for the Postgres backend.
 *
 * Two serverless instances cold-starting together both find the schema
 * missing and both create it. The loser used to return a 500 -- seen in
 * production as NeonDbError 23505 on pg_class_relname_nsp_index while
 * creating users_id_seq, and reproduced locally against Postgres 16 as 42P07
 * on the table itself. These cover both shapes, so neither regresses.
 */
import { describe, expect, it } from 'vitest';
import { isConcurrentCreate } from '../server/storage/postgres.js';

/** The exact error Vercel logged, trimmed to the fields the check reads. */
const productionError = Object.assign(new Error('Failed query: CREATE TABLE IF NOT EXISTS users'), {
  cause: Object.assign(
    new Error('duplicate key value violates unique constraint "pg_class_relname_nsp_index"'),
    {
      severity: 'ERROR',
      code: '23505',
      detail: 'Key (relname, relnamespace)=(users_id_seq, 2200) already exists.',
      constraint: 'pg_class_relname_nsp_index',
      schema: 'pg_catalog',
      table: 'pg_class',
    },
  ),
});

/** What Postgres 16 raises directly when the table itself loses the race. */
const localError = Object.assign(new Error('relation "users" already exists'), {
  code: '42P07',
  severity: 'ERROR',
});

describe('isConcurrentCreate', () => {
  it('recognises the production sequence-catalogue collision', () => {
    expect(isConcurrentCreate(productionError)).toBe(true);
  });

  it('recognises a plain duplicate_table', () => {
    expect(isConcurrentCreate(localError)).toBe(true);
  });

  it.each([['42710'], ['42P06'], ['42723']])('recognises duplicate-object code %s', (code) => {
    expect(isConcurrentCreate(Object.assign(new Error('dup'), { code }))).toBe(true);
  });

  it('finds the code however deeply it is wrapped', () => {
    const wrapped = { cause: { cause: { cause: { code: '42P07' } } } };
    expect(isConcurrentCreate(wrapped)).toBe(true);
  });

  it('does NOT swallow a unique violation on application data', () => {
    // A duplicate username during seeding is a real problem, not a race on
    // the catalogue, and must still surface.
    const appDuplicate = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'users_username_unique',
      table: 'users',
    });
    expect(isConcurrentCreate(appDuplicate)).toBe(false);
  });

  it.each([
    ['a connection failure', { code: 'ECONNREFUSED' }],
    ['a syntax error', { code: '42601' }],
    ['an undefined table', { code: '42P01' }],
    ['a permission denial', { code: '42501' }],
  ])('does not treat %s as a race', (_label, shape) => {
    expect(isConcurrentCreate(Object.assign(new Error('boom'), shape))).toBe(false);
  });

  it('handles errors with no code, and non-errors', () => {
    expect(isConcurrentCreate(new Error('plain'))).toBe(false);
    expect(isConcurrentCreate(null)).toBe(false);
    expect(isConcurrentCreate(undefined)).toBe(false);
    expect(isConcurrentCreate('a string')).toBe(false);
  });

  it('terminates on a self-referential cause chain', () => {
    const loop: { code?: string; cause?: unknown } = {};
    loop.cause = loop;
    expect(isConcurrentCreate(loop)).toBe(false);
  });
});
