import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { optionsScenarios, resolveScenarioName } from '../../helpers/scenarios.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const RUN_ID = Date.now();
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
  const res = http.get(`${BASE_URL}/users`);
  const count = res.status === 200 ? res.json().length : 0;
  if (count >= 10) return;
  for (let i = count; i < 10; i++) {
    http.post(
      `${BASE_URL}/users`,
      JSON.stringify({
        name: `Seed User ${i}`,
        email: `seed-${RUN_ID}-${i}@example.com`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export default function () {
  const id = ((__VU - 1) % 10) + 1;
  const name = `Load Test User ${__VU}-${__ITER}`;
  const email = `load_test_user-${RUN_ID}-${__VU}-${__ITER}@example.com`;
  const phone = '99999-9999';

  const payload = JSON.stringify({ name, email, phone });

  const response = http.put(
    `${BASE_URL}/users/${id}`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: `PUT /users/${id}` },
    },
  );

  if (response.status >= 400) {
    console.error(`PUT /users/${id} -> ${response.status}: ${response.body}`);
  }

  const user = response.status === 200 ? response.json() : {};

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(user, {
    'has id': (u) => u.id !== undefined,
    'id matches': (u) => u.id === id,
    'name matches': (u) => u.name === name,
    'email matches': (u) => u.email === email,
    'has updated_at': (u) => u.updated_at !== undefined,
  });

  sleep(randomIntBetween(500, 1500));
}