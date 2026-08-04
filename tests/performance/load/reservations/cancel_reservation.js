import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from '../../helpers/helpers.js';
import { computePoolConfig, resolveSeedKey } from '../../helpers/delete_helpers.js';
import { activeProfiles, optionsScenarios, resolveScenarioName } from '../../helpers/scenarios.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = resolveScenarioName();

const SEED_API_KEY = resolveSeedKey();

export const options = {
  scenarios: optionsScenarios(SCENARIO),
  setupTimeout: '10m',
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_waiting: [{ threshold: 'p(95)<500', abortOnFail: false }],
  },
};

export function setup() {
  const { poolSize, maxVus } = computePoolConfig(activeProfiles(SCENARIO));

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