import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { optionsScenarios, resolveScenarioName } from '../../helpers/scenarios.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const RUN_ID = Date.now();
const SCENARIO = resolveScenarioName();
const DAY_MS = 86400000;

export const options = {
  scenarios: optionsScenarios(SCENARIO),
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_waiting: [{ threshold: 'p(95)<500', abortOnFail: false }],
  },
};

export function setup() {
  const userIds = [];
  for (let i = 0; i < 10; i++) {
    const user = http.post(
      `${BASE_URL}/users`,
      JSON.stringify({
        name: `Res Seed User ${RUN_ID}-${i}`,
        email: `seed-res-${RUN_ID}-${i}@example.com`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (user.status !== 201) {
      throw new Error(`setup POST /users -> ${user.status}: ${user.body}`);
    }
    userIds.push(user.json().id);
  }

  const room = http.post(
    `${BASE_URL}/rooms`,
    JSON.stringify({
      name: `Res Seed Room ${RUN_ID}`,
      capacity: 2,
      price_per_night: 99.99,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (room.status !== 201) {
    throw new Error(`setup POST /rooms -> ${room.status}: ${room.body}`);
  }
  const roomId = room.json().id;

  for (let i = 0; i < userIds.length; i++) {
    const checkIn = new Date(Date.now() + i * DAY_MS).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + (i + 1) * DAY_MS).toISOString().slice(0, 10);
    const res = http.post(
      `${BASE_URL}/reservations`,
      JSON.stringify({ user_id: userIds[i], room_id: roomId, check_in: checkIn, check_out: checkOut }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.status !== 201) {
      throw new Error(`setup POST /reservations -> ${res.status}: ${res.body}`);
    }
  }

  return { userIds };
}

export default function (data) {
  const id = data.userIds[((__VU - 1) % data.userIds.length)];

  const response = http.get(`${BASE_URL}/reservations/user/${id}`, {
    tags: { endpoint: `GET /reservations/user/${id}` },
  });

  if (response.status >= 400) {
    console.error(`GET /reservations/user/${id} -> ${response.status}: ${response.body}`);
  }

  const reservations = response.status === 200 ? response.json() : [];

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(reservations, {
    'has reservations': (r) => r.length > 0,
    'has id': (r) => r.every((res) => res.id !== undefined),
    'has user_id': (r) => r.every((res) => res.user_id !== undefined),
    'has room_id': (r) => r.every((res) => res.room_id !== undefined),
    'has check_in': (r) => r.every((res) => res.check_in !== undefined),
    'has check_out': (r) => r.every((res) => res.check_out !== undefined),
    'has status': (r) => r.every((res) => res.status !== undefined),
    'has created_at': (r) => r.every((res) => res.created_at !== undefined),
    'has updated_at': (r) => r.every((res) => res.updated_at !== undefined),
  });

  sleep(randomIntBetween(500, 1500));
}