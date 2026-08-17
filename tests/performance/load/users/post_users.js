import { check } from 'k6';
import { postJson, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { BASE_URL, RUN_ID } from '../../helpers/config.js';

export const options = loadOptions();

export default function () {
  const name = `Load Test User ${__VU}-${__ITER}`;
  const email = `load_test_user-${RUN_ID}-${__VU}-${__ITER}@example.com`;

  const payload = {
    name,
    email,
    phone: '99999-9999',
  };

  const response = postJson(`${BASE_URL}/users`, payload, { endpoint: 'POST /users' });
  logFailure('POST', `${BASE_URL}/users`, response);

  const user = parseBody(response, 201, {});

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  if (response.status !== 201) return;

  check(user, {
    'has id': (u) => u.id !== undefined,
    'name matches': (u) => u.name === name,
    'email matches': (u) => u.email === email,
    'phone matches': (u) => u.phone === '99999-9999',
    'created_at exists': (u) => u.created_at !== undefined,
  });

  sleepBetween();
}
