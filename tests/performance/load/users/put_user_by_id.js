import { check } from 'k6';
import { getJson, putJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { ensureRows } from '../../helpers/seed_helpers.js';
import { BASE_URL, RUN_ID } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  ensureRows('users', 10, 'Seed User');
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
