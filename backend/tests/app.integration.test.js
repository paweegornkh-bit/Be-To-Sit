import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const ORIGIN = 'http://tabletime.test';
const createdUserIds = new Set();
const createdZoneIds = new Set();
const createdTableIds = new Set();
const createdCategoryIds = new Set();

const http = () => request(app);
const withOrigin = (call) => call.set('Origin', ORIGIN);
const auth = (call, token) => withOrigin(call).set('Authorization', `Bearer ${token}`);
const futureDate = (days = 7) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

async function createUser({ role = 'CUSTOMER', email = `test-${randomUUID()}@example.test`,
  password = 'SecurePass123' } = {}) {
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Vitest Customer',
      phone: '0812345678',
      role,
      passwordHash: await bcrypt.hash(password, 4),
      failedLogins: 0
    }
  });
  createdUserIds.add(user.id);
  return user;
}

async function createTable() {
  const suffix = randomUUID();
  const zone = await prisma.zone.create({ data: { name: `Test zone ${suffix}` } });
  createdZoneIds.add(zone.id);
  const table = await prisma.table.create({
    data: { zoneId: zone.id, tableNo: `T${suffix.replaceAll('-', '').slice(0, 10)}`, seats: 4 }
  });
  createdTableIds.add(table.id);
  return table;
}

async function login(user, password = 'SecurePass123') {
  return withOrigin(http().post('/api/v1/auth/login')).send({ email: user.email, password });
}

async function getAccessToken(user) {
  const response = await login(user);
  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

async function createReservation(token, tableId, overrides = {}) {
  return auth(http().post('/api/v1/reservations'), token).send({
    tableId,
    reserveDate: futureDate(),
    timeSlot: '19:00',
    partySize: 2,
    ...overrides
  });
}

afterEach(async () => {
  const reservationRows = createdUserIds.size
    ? await prisma.reservation.findMany({
      where: { userId: { in: [...createdUserIds] } }, select: { id: true }
    })
    : [];
  const reservationIds = reservationRows.map(({ id }) => id);

  if (reservationIds.length) {
    await prisma.payment.deleteMany({ where: { reservationId: { in: reservationIds } } });
    await prisma.review.deleteMany({ where: { reservationId: { in: reservationIds } } });
    await prisma.reservationItem.deleteMany({ where: { reservationId: { in: reservationIds } } });
    await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
  }
  if (createdTableIds.size) {
    await prisma.table.deleteMany({ where: { id: { in: [...createdTableIds] } } });
  }
  if (createdZoneIds.size) {
    await prisma.zone.deleteMany({ where: { id: { in: [...createdZoneIds] } } });
  }
  if (createdCategoryIds.size) {
    await prisma.menuCategory.deleteMany({ where: { id: { in: [...createdCategoryIds] } } });
  }
  if (createdUserIds.size) {
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
  }

  createdUserIds.clear();
  createdZoneIds.clear();
  createdTableIds.clear();
  createdCategoryIds.clear();
});

describe('auth API', () => {
  it('registers a customer and stores only a password hash', async () => {
    const email = `register-${randomUUID()}@example.test`;
    const response = withOrigin(http().post('/api/v1/auth/register')).send({
      email,
      password: 'SecurePass123',
      fullName: 'New Test User',
      phone: '0812345678'
    });

    const result = await response;
    const storedUser = await prisma.user.findUnique({ where: { email } });
    if (storedUser) createdUserIds.add(storedUser.id);
    expect(result.status).toBe(201);
    expect(result.body.data.user.role).toBe('CUSTOMER');
    expect(result.body.data.accessToken).toEqual(expect.any(String));

    expect(storedUser.passwordHash).not.toBe('SecurePass123');
    expect(storedUser.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('logs in successfully and rejects an incorrect password', async () => {
    const user = await createUser();
    const success = await login(user);
    expect(success.status).toBe(200);
    expect(success.body.data.user.id).toBe(user.id);
    expect(success.body.data.accessToken).toEqual(expect.any(String));

    const failure = await login(user, 'WrongPass123');
    expect(failure.status).toBe(401);
    expect(failure.body.error.code).toBe('UNAUTHORIZED');
  });

  it('locks the account after five incorrect passwords', async () => {
    const user = await createUser();
    for (let attempt = 0; attempt < 5; attempt++) {
      const failedLogin = await login(user, 'WrongPass123');
      expect(failedLogin.status).toBe(401);
    }

    const storedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(storedUser.failedLogins).toBe(5);
    expect(storedUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());

    const lockedResponse = await login(user);
    expect(lockedResponse.status).toBe(403);
    expect(lockedResponse.body.error.message).toContain('ล็อกชั่วคราว');
  });
});

describe('RBAC API', () => {
  it('returns 401 without a token and 403 for CUSTOMER on reports', async () => {
    const anonymous = await withOrigin(http().get('/api/v1/reports/overview'));
    expect(anonymous.status).toBe(401);

    const user = await createUser();
    const token = await getAccessToken(user);
    const forbidden = await auth(http().get('/api/v1/reports/overview'), token);
    expect(forbidden.status).toBe(403);
  });
});

describe('reservation API', () => {
  it('creates a reservation successfully', async () => {
    const user = await createUser();
    const table = await createTable();
    const token = await getAccessToken(user);

    const response = await createReservation(token, table.id);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tableId).toBe(table.id);
    expect(response.body.data.userId).toBe(user.id);
  });

  it('returns 409 when the table and time slot are already reserved', async () => {
    const user = await createUser();
    const table = await createTable();
    const token = await getAccessToken(user);
    const payload = { reserveDate: futureDate(8), timeSlot: '17:00' };

    const first = await createReservation(token, table.id, payload);
    expect(first.status).toBe(201);
    const duplicate = await createReservation(token, table.id, payload);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('TABLE_NOT_AVAILABLE');
  });

  it('rejects reservations in the past', async () => {
    const user = await createUser();
    const table = await createTable();
    const token = await getAccessToken(user);

    const response = await createReservation(token, table.id, { reserveDate: '2000-01-01' });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('ย้อนหลัง');
  });
});

describe('request validation API', () => {
  it('returns 400 for malformed payloads and unexpected fields', async () => {
    const malformed = await withOrigin(http().post('/api/v1/auth/login'))
      .send({ email: 'not-an-email', password: '' });
    expect(malformed.status).toBe(400);

    const extraField = await withOrigin(http().post('/api/v1/auth/login'))
      .send({ email: 'customer@example.test', password: 'SecurePass123', role: 'OWNER' });
    expect(extraField.status).toBe(400);
    expect(extraField.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('input security API', () => {
  it('strips script markup from reservation notes and treats SQL-like menu search as data', async () => {
    const user = await createUser();
    const table = await createTable();
    const token = await getAccessToken(user);
    const note = 'Dinner <script>alert(1)</script>';

    const reservation = await createReservation(token, table.id, {
      reserveDate: futureDate(9), note
    });
    expect(reservation.status).toBe(201);
    expect(reservation.body.data.note).not.toContain('<script');
    expect(reservation.body.data.note).not.toContain('<');

    const stored = await prisma.reservation.findUnique({ where: { id: reservation.body.data.id } });
    expect(stored.note).not.toContain('<script');
    expect(stored.note).not.toContain('<');

    const search = await withOrigin(http().get('/api/v1/menu-items')
      .query({ q: "' OR 1=1 --" }));
    expect(search.status).toBe(200);
    expect(search.body.success).toBe(true);
    expect(search.body.data).toEqual([]);
  });
});
