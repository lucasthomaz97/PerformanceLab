import { check } from 'k6';
import { getJson, postJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = loadOptions();

export function setup() {
  const res = getJson(`${BASE_URL}/users`);
  if (res.status === 200 && res.json().length === 0) {
    postJson(`${BASE_URL}/users`, { name: 'Seed User', email: 'seed-user@example.com' });
  }
}

export default function () {
  const response = getJson(`${BASE_URL}/users`, { endpoint: 'GET /users' });
  logFailure('GET', `${BASE_URL}/users`, response);

  const users = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => r.body.length > 0,
  });

  checkListFields(users, 'users', ['id', 'name', 'email', 'created_at', 'updated_at']);

  sleepBetween();
}
