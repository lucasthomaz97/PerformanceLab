import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = __ENV.K6_SCENARIO || 'load';
const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';
const DELETE_POOL_OVERRIDE = __ENV.K6_DELETE_POOL_SIZE || 0;

const SEED_API_KEY = resolveSeedKey();

function resolveSeedKey() {
  if (__ENV.SEED_API_KEY) return __ENV.SEED_API_KEY;
  let envText = '';
  try {
    envText = open('../../../.env');
  } catch (e) {
    return '';
  }
  for (const line of envText.split(/\r?\n/)) {
    const match = /^SEED_API_KEY=(.*)$/.exec(line.trim());
    if (match) return match[1];
  }
  return '';
}

const AVG_ITER_SECONDS = 1.0;
const POOL_SAFETY = 1.2;

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

function parseDuration(duration) {
  const match = /^(\d+(?:\.\d+)?)([smh])$/.exec(duration);
  if (!match) throw new Error(`unsupported k6 duration: ${duration}`);
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  return value * 3600;
}

function computePoolConfig(scenario) {
  let maxVus = 0;
  let totalSeconds = 0;

  if (scenario.executor === 'constant-vus') {
    maxVus = scenario.vus;
    totalSeconds = parseDuration(scenario.duration);
  } else if (scenario.executor === 'ramping-vus') {
    maxVus = Math.max(scenario.startVUs, ...scenario.stages.map((s) => s.target));
    for (const stage of scenario.stages) {
      totalSeconds += parseDuration(stage.duration);
    }
  }

  const poolSize =
    DELETE_POOL_OVERRIDE ||
    Math.ceil((maxVus * (totalSeconds / AVG_ITER_SECONDS)) * POOL_SAFETY);

  return { poolSize, maxVus };
}

export function setup() {
  const { poolSize, maxVus } = computePoolConfig(scenarios[SCENARIO]);

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