import { check } from 'k6';
import { getJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { ensureOneIfEmpty } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  ensureOneIfEmpty('users');
}

export default function () {
  const response = getJson(`${BASE_URL}/users`, { endpoint: 'GET /users' });
  logFailure('GET', `${BASE_URL}/users`, response);

  const users = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  checkListFields(users, 'users', ['id', 'name', 'email', 'created_at', 'updated_at']);

  sleepBetween();
}
