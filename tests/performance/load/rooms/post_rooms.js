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
  const name = `Load Test Room ${RUN_ID}-${__VU}-${__ITER}`;
  const capacity = 2;
  const price_per_night = 149.99;

  const payload = JSON.stringify({
    name,
    capacity,
    price_per_night,
    description: 'Load test room',
  });

  const response = http.post(
    `${BASE_URL}/rooms`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'POST /rooms' },
    },
  );

  if (response.status >= 400) {
    console.error(`POST /rooms -> ${response.status}: ${response.body}`);
  }

  const room = response.status === 201 ? response.json() : {};

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  check(room, {
    'has id': (r) => r.id !== undefined,
    'name matches': (r) => r.name === name,
    'capacity matches': (r) => r.capacity === capacity,
    'price_per_night matches': (r) => Number(r.price_per_night) === price_per_night,
    'created_at exists': (r) => r.created_at !== undefined,
  });

  sleep(randomIntBetween(500, 1500));
}
