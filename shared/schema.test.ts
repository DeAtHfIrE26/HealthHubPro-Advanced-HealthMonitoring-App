import { describe, expect, it } from 'vitest';
import {
  isoDateSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  upsertActivitySchema,
  upsertGoalSchema,
} from './schema';

describe('registerSchema', () => {
  const valid = {
    username: 'kashyap',
    email: 'Kashyap@Example.COM',
    password: 'longenough1',
    firstName: 'Kashyap',
    lastName: 'Patel',
  };

  it('accepts a valid payload and lowercases the email', () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe('kashyap@example.com');
  });

  it('trims surrounding whitespace on names', () => {
    const parsed = registerSchema.parse({ ...valid, firstName: '  Kashyap  ' });
    expect(parsed.firstName).toBe('Kashyap');
  });

  it.each([
    ['too short', 'ab'],
    ['with a space', 'kash yap'],
    ['with punctuation', 'kash.yap'],
    ['empty', ''],
  ])('rejects a username %s', (_label, username) => {
    expect(registerSchema.safeParse({ ...valid, username }).success).toBe(false);
  });

  it('rejects a password under 8 characters', () => {
    expect(registerSchema.safeParse({ ...valid, password: '1234567' }).success).toBe(false);
  });

  it('accepts a password of exactly 8 characters', () => {
    expect(registerSchema.safeParse({ ...valid, password: '12345678' }).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('accepts unicode names', () => {
    const parsed = registerSchema.parse({ ...valid, firstName: 'Zoë', lastName: '田中' });
    expect(parsed.firstName).toBe('Zoë');
    expect(parsed.lastName).toBe('田中');
  });

  it('rejects a name longer than 50 characters', () => {
    expect(registerSchema.safeParse({ ...valid, firstName: 'a'.repeat(51) }).success).toBe(false);
  });

  it('rejects a whitespace-only name once trimmed', () => {
    expect(registerSchema.safeParse({ ...valid, firstName: '   ' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires both fields', () => {
    expect(loginSchema.safeParse({ username: '', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'x', password: '' }).success).toBe(false);
  });

  it('does not enforce password rules on sign-in', () => {
    // Legacy or changed policies must not lock an existing user out.
    expect(loginSchema.safeParse({ username: 'demo', password: 'a' }).success).toBe(true);
  });
});

describe('isoDateSchema', () => {
  it.each(['2026-09-20', '2024-02-29', '2000-01-01'])('accepts %s', (date) => {
    expect(isoDateSchema.safeParse(date).success).toBe(true);
  });

  it.each([
    ['a non-leap 29 February', '2026-02-29'],
    ['day 31 in a 30-day month', '2026-04-31'],
    ['month 13', '2026-13-01'],
    ['day 00', '2026-01-00'],
    ['a slashed date', '2026/09/20'],
    ['a short year', '26-09-20'],
    ['an empty string', ''],
  ])('rejects %s', (_label, date) => {
    expect(isoDateSchema.safeParse(date).success).toBe(false);
  });
});

describe('upsertActivitySchema', () => {
  it('accepts a single metric', () => {
    expect(upsertActivitySchema.safeParse({ steps: 5000 }).success).toBe(true);
  });

  it('accepts zero as a real value', () => {
    expect(upsertActivitySchema.safeParse({ steps: 0 }).success).toBe(true);
  });

  it('rejects an empty payload', () => {
    expect(upsertActivitySchema.safeParse({}).success).toBe(false);
  });

  it('rejects a payload of only a date', () => {
    expect(upsertActivitySchema.safeParse({ date: '2026-09-20' }).success).toBe(false);
  });

  it('rejects negative values', () => {
    expect(upsertActivitySchema.safeParse({ steps: -1 }).success).toBe(false);
  });

  it('rejects absurd values', () => {
    expect(upsertActivitySchema.safeParse({ steps: 300_001 }).success).toBe(false);
    expect(upsertActivitySchema.safeParse({ sleepHours: 24.1 }).success).toBe(false);
    expect(upsertActivitySchema.safeParse({ activeMinutes: 1441 }).success).toBe(false);
  });

  it('accepts the exact upper bounds', () => {
    expect(upsertActivitySchema.safeParse({ steps: 300_000 }).success).toBe(true);
    expect(upsertActivitySchema.safeParse({ sleepHours: 24 }).success).toBe(true);
  });

  it('rejects a fractional step count', () => {
    expect(upsertActivitySchema.safeParse({ steps: 1.5 }).success).toBe(false);
  });

  it('allows fractional sleep and water', () => {
    expect(upsertActivitySchema.safeParse({ sleepHours: 7.5, waterLiters: 2.4 }).success).toBe(
      true,
    );
  });

  it('rejects unknown keys', () => {
    expect(upsertActivitySchema.safeParse({ steps: 10, hackedField: 1 }).success).toBe(false);
  });

  it('rejects a string where a number belongs', () => {
    expect(upsertActivitySchema.safeParse({ steps: '5000' }).success).toBe(false);
  });
});

describe('upsertGoalSchema', () => {
  it('accepts a known goal type', () => {
    expect(upsertGoalSchema.safeParse({ type: 'steps', target: 10_000 }).success).toBe(true);
  });

  it('rejects an unknown goal type', () => {
    expect(upsertGoalSchema.safeParse({ type: 'vibes', target: 10 }).success).toBe(false);
  });

  it('rejects a zero or negative target', () => {
    expect(upsertGoalSchema.safeParse({ type: 'steps', target: 0 }).success).toBe(false);
    expect(upsertGoalSchema.safeParse({ type: 'steps', target: -5 }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts an empty patch', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it('allows explicitly clearing a nullable field', () => {
    expect(updateProfileSchema.safeParse({ heightCm: null }).success).toBe(true);
  });

  it('rejects out-of-range measurements', () => {
    expect(updateProfileSchema.safeParse({ heightCm: 10 }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ age: 12 }).success).toBe(false);
  });

  it('rejects privilege-escalation style extra keys', () => {
    expect(updateProfileSchema.safeParse({ role: 'admin' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ passwordHash: 'x' }).success).toBe(false);
  });
});
