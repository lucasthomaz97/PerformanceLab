import { check } from 'k6';
import { patchJson, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { seedPool } from '../../helpers/seed_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = loadOptions({ setupTimeout: '10m' });

export function setup() {
  return seedPool('reservations');
}

export default function (data) {
  const idx = ((__VU - 1) * data.sliceSize) + (__ITER % data.sliceSize);
  const id = data.ids[idx];

  const response = patchJson(
    `${BASE_URL}/reservations/${id}/cancel`,
    null,
    { endpoint: `PATCH /reservations/${id}/cancel` },
  );
  logFailure('PATCH', `${BASE_URL}/reservations/${id}/cancel`, response);

  const reservation = parseBody(response, 200, {});

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(reservation, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'status cancelled': (r) => r.status === 'cancelled',
  });

  sleepBetween();
}
