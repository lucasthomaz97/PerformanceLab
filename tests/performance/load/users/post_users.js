import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const RUN_ID = Date.now();
const SCENARIO = __ENV.K6_SCENARIO || 'load';
const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';

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