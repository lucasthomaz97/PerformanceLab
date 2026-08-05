import { check } from 'k6';
import { getJson, postJson, putJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
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
  const name = `Load Test User ${__VU}-${__ITER}`;
  const email = `load_test_user-${RUN_ID}-${__VU}-${__ITER}@example.com`;
  const phone = '99999-9999';

  const response = putJson(
    `${BASE_URL}/users/${id}`,
    { name, email, phone },
    { endpoint: `PUT /users/${id}` },
  );
  logFailure('PUT', `${BASE_URL}/users/${id}`, response);

  const user = parseBody(response, 200, {});

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(user, {
    'has id': (u) => u.id !== undefined,
    'id matches': (u) => u.id === id,
    'name matches': (u) => u.name === name,
    'email matches': (u) => u.email === email,
    'has updated_at': (u) => u.updated_at !== undefined,
  });

  sleepBetween();
}
