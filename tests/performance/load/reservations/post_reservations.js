import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { computePoolConfig } from '../../helpers/delete_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = __ENV.K6_SCENARIO || 'load';
const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';
const DAY_MS = 86400000;

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 3,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 30 },
      { duration: '2m', target: 30 },
      { duration: '10s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  staircase: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '45s', target: 10 },
      { duration: '45s', target: 15 },
      { duration: '45s', target: 20 },
      { duration: '45s', target: 25 },
      { duration: '45s', target: 30 },
      { duration: '45s', target: 40 },
      { duration: '45s', target: 50 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  soak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 40 },
      { duration: SOAK_DURATION, target: 40 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO],
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_waiting: [{ threshold: 'p(95)<500', abortOnFail: false }],
  },
};

function isoDateFromOffset(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

export function setup() {
  const { maxVus } = computePoolConfig(scenarios[SCENARIO]);

  let userId;
  let roomId;

  const usersRes = http.get(`${BASE_URL}/users`);
  if (usersRes.status === 200 && usersRes.json().length > 0) {
    userId = usersRes.json()[0].id;
  } else {
    const res = http.post(
      `${BASE_URL}/users`,
      JSON.stringify({ name: 'Res Seed User', email: `seed-res-user-${Date.now()}@example.com` }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.status !== 201) {
      throw new Error(`setup POST /users -> ${res.status}: ${res.body}`);
    }
    userId = res.json().id;
  }

  const roomsRes = http.get(`${BASE_URL}/rooms`);
  if (roomsRes.status === 200 && roomsRes.json().length > 0) {
    roomId = roomsRes.json()[0].id;
  } else {
    const res = http.post(
      `${BASE_URL}/rooms`,
      JSON.stringify({ name: `Res Seed Room ${Date.now()}`, capacity: 2, price_per_night: 99.99 }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.status !== 201) {
      throw new Error(`setup POST /rooms -> ${res.status}: ${res.body}`);
    }
    roomId = res.json().id;
  }

  return { userId, roomId, maxVus };
}

export default function (data) {
  const offset = __ITER * data.maxVus + (__VU - 1);
  const check_in = isoDateFromOffset(offset);
  const check_out = isoDateFromOffset(offset + 1);

  const payload = JSON.stringify({
    user_id: data.userId,
    room_id: data.roomId,
    check_in,
    check_out,
  });

  const response = http.post(
    `${BASE_URL}/reservations`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'POST /reservations' },
    },
  );

  if (response.status >= 400) {
    console.error(`POST /reservations -> ${response.status}: ${response.body}`);
  }

  const reservation = response.status === 201 ? response.json() : {};

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  check(reservation, {
    'has id': (r) => r.id !== undefined,
    'user_id matches': (r) => r.user_id === data.userId,
    'room_id matches': (r) => r.room_id === data.roomId,
    'status confirmed': (r) => r.status === 'confirmed',
    'created_at exists': (r) => r.created_at !== undefined,
  });

  sleep(randomIntBetween(500, 1500));
}