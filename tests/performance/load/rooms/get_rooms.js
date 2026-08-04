import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { optionsScenarios, resolveScenarioName } from '../../helpers/scenarios.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = resolveScenarioName();

export const options = {
  scenarios: optionsScenarios(SCENARIO),
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_waiting: [{ threshold: 'p(95)<500', abortOnFail: false }],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/rooms`);
  if (res.status === 200 && res.json().length === 0) {
    http.post(
      `${BASE_URL}/rooms`,
      JSON.stringify({
        name: 'Seed Room',
        capacity: 2,
        price_per_night: 99.99,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export default function () {
  const response = http.get(`${BASE_URL}/rooms`, {
    tags: { endpoint: 'GET /rooms' },
  });

  if (response.status >= 400) {
    console.error(`GET /rooms -> ${response.status}: ${response.body}`);
  }

  const rooms = response.status === 200 ? response.json() : [];

  check(response, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => r.body.length > 0,
  });

  check(rooms, {
    'has rooms': (r) => r.length > 0,
    'has id': (r) => r.every((room) => room.id !== undefined),
    'has name': (r) => r.every((room) => room.name !== undefined),
    'has capacity': (r) => r.every((room) => room.capacity !== undefined),
    'has price_per_night': (r) => r.every((room) => room.price_per_night !== undefined),
    'has is_active': (r) => r.every((room) => room.is_active !== undefined),
    'has created_at': (r) => r.every((room) => room.created_at !== undefined),
    'has updated_at': (r) => r.every((room) => room.updated_at !== undefined),
  });

  sleep(randomIntBetween(500, 1500));
}
