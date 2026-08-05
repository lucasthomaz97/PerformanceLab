import { check } from 'k6';
import { getJson, postJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const RUN_ID = Date.now();

export const options = loadOptions();

export function setup() {
  const res = getJson(`${BASE_URL}/users`);
  const count = res.status === 200 ? res.json().length : 0;
  if (count >= 10) return;
  for (let i = count; i < 10; i++) {
    postJson(`${BASE_URL}/users`, {
      name: `Seed User ${i}`,
      email: `seed-${RUN_ID}-${i}@example.com`,
    });
  }
}

export default function () {
  const id = nextIdFromVus(10);

  const response = getJson(`${BASE_URL}/users/${id}`, { endpoint: `GET /users/${id}` });
  logFailure('GET', `${BASE_URL}/users/${id}`, response);

  const user = parseBody(response, 200, {});

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(user, {
    'has id': (u) => u.id !== undefined,
    'id matches': (u) => u.id === id,
    'has name': (u) => u.name !== undefined,
    'has email': (u) => u.email !== undefined,
  });

  sleepBetween();
}
