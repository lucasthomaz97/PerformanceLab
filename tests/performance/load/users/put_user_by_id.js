import { check } from 'k6';
import { putJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { byIdSeedCount } from '../../helpers/pool_helpers.js';
import { ensureRows } from '../../helpers/seed_helpers.js';
import { BASE_URL, RUN_ID, SCENARIO } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const count = byIdSeedCount(SCENARIO);
  ensureRows('users', count, 'Seed User');
  return { count };
}

export default function (data) {
  const id = nextIdFromVus(data.count);
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
