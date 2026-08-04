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
  const res = http.get(`${BASE_URL}/rooms`);
  const count = res.status === 200 ? res.json().length : 0;
  if (count >= 10) return;
  for (let i = count; i < 10; i++) {
    http.post(
      `${BASE_URL}/rooms`,
      JSON.stringify({
        name: `Seed Room ${RUN_ID}-${i}`,
        capacity: 2,
        price_per_night: 99.99,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export default function () {
  const id = ((__VU - 1) % 10) + 1;

  const response = http.get(`${BASE_URL}/rooms/${id}`, {
    tags: { endpoint: `GET /rooms/${id}` },
  });

  if (response.status >= 400) {
    console.error(`GET /rooms/${id} -> ${response.status}: ${response.body}`);
  }

  const room = response.status === 200 ? response.json() : {};

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(room, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'has name': (r) => r.name !== undefined,
    'has capacity': (r) => r.capacity !== undefined,
    'has price_per_night': (r) => r.price_per_night !== undefined,
  });

  sleep(randomIntBetween(500, 1500));
}
