import { describe, expect, it } from 'vitest';
import { loginSchema, createReservationSchema } from '../src/validators/index.js';
import { assertSeedAllowed } from '../prisma/seed-policy.js';

describe('request schemas', () => {
  it('rejects malformed login payloads', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
  });

  it('accepts a valid reservation payload and defaults menu items', () => {
    const result = createReservationSchema.safeParse({
      tableId: '00000000-0000-4000-8000-000000000000',
      reserveDate: '2026-10-01',
      timeSlot: '19:00',
      partySize: '2'
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toEqual([]);
  });
});

describe('seed environment policy', () => {
  it.each(['development', 'uat'])('permits opted-in %s seeding', (appEnv) => {
    expect(() => assertSeedAllowed({ appEnv, nodeEnv: 'production', allowTestSeed: 'true' }))
      .not.toThrow();
  });

  it('rejects production even with the opt-in flag', () => {
    expect(() => assertSeedAllowed({
      appEnv: 'production', nodeEnv: 'production', allowTestSeed: 'true'
    })).toThrow('Seed data is disabled in production');
  });

  it('requires explicit opt-in', () => {
    expect(() => assertSeedAllowed({ appEnv: 'uat', allowTestSeed: 'false' }))
      .toThrow('Set ALLOW_TEST_SEED=true');
  });
});
