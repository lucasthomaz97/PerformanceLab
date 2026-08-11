import { check } from 'k6';
import { getJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { byIdSeedCount } from '../../helpers/pool_helpers.js';
import { ensureRows } from '../../helpers/seed_helpers.js';
import { BASE_URL, SCENARIO } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const count = byIdSeedCount(SCENARIO);
  ensureRows('users', count, 'Seed User');
  return { count };
}

export default function (data) {
  const id = nextIdFromVus(data.count);

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
