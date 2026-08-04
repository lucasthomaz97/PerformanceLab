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
    `${BASE_URL}/seed/users`,
    JSON.stringify({ quantity: poolSize }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Seed-Key': SEED_API_KEY,
      },
      tags: { endpoint: 'POST /seed/users' },
    },
  );

  if (res.status !== 201) {
    throw new Error(`seed POST /seed/users -> ${res.status}: ${res.body}`);
  }

  const ids = res.json().ids;
  const sliceSize = Math.floor(ids.length / maxVus);

  console.info(`seeded ${ids.length} users, slice per VU: ${sliceSize}`);

  return { ids, sliceSize };
}

export default function (data) {
  const idx = ((__VU - 1) * data.sliceSize) + (__ITER % data.sliceSize);
  const id = data.ids[idx];

  const response = http.del(
    `${BASE_URL}/users/${id}`,
    null,
    { tags: { endpoint: `DELETE /users/${id}` } },
  );

  if (response.status >= 400) {
    console.error(`DELETE /users/${id} -> ${response.status}: ${response.body}`);
  }

  check(response, {
    'status 204': (r) => r.status === 204,
  });

  sleep(randomIntBetween(500, 1500));
}