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
