import { check } from 'k6';
import { delJson, logFailure, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { seedPool } from '../../helpers/seed_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = loadOptions({ setupTimeout: '10m' });

export function setup() {
  return seedPool('rooms');
}

export default function (data) {
  const idx = ((__VU - 1) * data.sliceSize) + (__ITER % data.sliceSize);
  const id = data.ids[idx];

  const response = delJson(`${BASE_URL}/rooms/${id}`, { endpoint: `DELETE /rooms/${id}` });
  logFailure('DELETE', `${BASE_URL}/rooms/${id}`, response);

  check(response, {
    'status 204': (r) => r.status === 204,
  });

  sleepBetween();
}
