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
  const res = http.get(`${BASE_URL}/users`);
  if (res.status === 200 && res.json().length === 0) {
    http.post(
      `${BASE_URL}/users`,
      JSON.stringify({ name: 'Seed User', email: 'seed-user@example.com' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export default function () {
  const response = http.get(`${BASE_URL}/users`, {
    tags: { endpoint: 'GET /users' },
  });

  if (response.status >= 400) {
    console.error(`GET /users -> ${response.status}: ${response.body}`);
  }

  const users = response.status === 200 ? response.json() : [];

  check(response, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => r.body.length > 0,
  });

  check(users, {
    'has users': (u) => u.length > 0,
    'has id': (u) => u.every((user) => user.id !== undefined),
    'has name': (u) => u.every((user) => user.name !== undefined),
    'has email': (u) => u.every((user) => user.email !== undefined),
    'has created_at': (u) => u.every((user) => user.created_at !== undefined),
    'has updated_at': (u) => u.every((user) => user.updated_at !== undefined),
  });

  sleep(randomIntBetween(500, 1500));
}