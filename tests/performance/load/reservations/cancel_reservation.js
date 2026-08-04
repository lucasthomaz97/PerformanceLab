import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { computePoolConfig, resolveSeedKey } from '../../helpers/delete_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = __ENV.K6_SCENARIO || 'load';
const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';

const SEED_API_KEY = resolveSeedKey();

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
  setupTimeout: '10m',
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_waiting: [{ threshold: 'p(95)<500', abortOnFail: false }],
  },
};

export function setup() {
  const { poolSize, maxVus } = computePoolConfig(scenarios[SCENARIO]);

  const res = http.post(
    `${BASE_URL}/seed/reservations`,
    JSON.stringify({ quantity: poolSize }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Seed-Key': SEED_API_KEY,
      },
      tags: { endpoint: 'POST /seed/reservations' },
    },
  );

  if (res.status !== 201) {
    throw new Error(`seed POST /seed/reservations -> ${res.status}: ${res.body}`);
  }

  const ids = res.json().ids;
  const sliceSize = Math.floor(ids.length / maxVus);

  console.info(`seeded ${ids.length} reservations, slice per VU: ${sliceSize}`);

  return { ids, sliceSize };
}

export default function (data) {
  const idx = ((__VU - 1) * data.sliceSize) + (__ITER % data.sliceSize);
  const id = data.ids[idx];

  const response = http.patch(
    `${BASE_URL}/reservations/${id}/cancel`,
    null,
    { tags: { endpoint: `PATCH /reservations/${id}/cancel` } },
  );

  if (response.status >= 400) {
    console.error(`PATCH /reservations/${id}/cancel -> ${response.status}: ${response.body}`);
  }

  const reservation = response.status === 200 ? response.json() : {};

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(reservation, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'status cancelled': (r) => r.status === 'cancelled',
  });

  sleep(randomIntBetween(500, 1500));
}