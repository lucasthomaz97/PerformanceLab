import { check } from 'k6';
import { delJson, logFailure, pacedSleep } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { seedPool } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions({ setupTimeout: '10m' });

export function setup() {
  return seedPool('users');
}

export default function (data) {
  const idx = data.sliceOffsets[__VU - 1] + (__ITER % data.sliceSizes[__VU - 1]);
  const id = data.ids[idx];

  const response = delJson(`${BASE_URL}/users/${id}`, { endpoint: `DELETE /users/${id}` });
  logFailure('DELETE', `${BASE_URL}/users/${id}`, response);

  check(response, {
    'status 204': (r) => r.status === 204,
  });

  pacedSleep('users');
}
