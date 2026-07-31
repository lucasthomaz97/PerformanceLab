import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = __ENV.K6_SCENARIO || 'load';
const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
      { duration: '1m', target: 25 },
      { duration: '2m', target: 25 },
      { duration: '1m', target: 50 },
      { duration: '2m', target: 50 },
      { duration: '30s', target: 0 },
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
