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

export default function () {
  const name = `Load Test User ${__VU}-${__ITER}`;
  const email = `load_test_user-${RUN_ID}-${__VU}-${__ITER}@example.com`;

  const payload = JSON.stringify({
    name,
    email,
    phone: '99999-9999',
  });

  const response = http.post(
    `${BASE_URL}/users`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'POST /users' },
    },
  );

  if (response.status >= 400) {
    console.error(`POST /users -> ${response.status}: ${response.body}`);
  }

  const user = response.status === 201 ? response.json() : {};

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  check(user, {
    'has id': (u) => u.id !== undefined,
    'name matches': (u) => u.name === name,
    'email matches': (u) => u.email === email,
    'created_at exists': (u) => u.created_at !== undefined,
  });

  sleep(randomIntBetween(500, 1500));
}