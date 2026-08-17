import { check } from 'k6';
import { patchJson, logFailure, parseBody, pacedSleep } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { seedPool } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions({ setupTimeout: '10m' });

export function setup() {
  return seedPool('reservations');
}

export default function (data) {
  const idx = data.sliceOffsets[__VU - 1] + (__ITER % data.sliceSizes[__VU - 1]);
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

  if (response.status !== 200) return;

  check(reservation, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'status cancelled': (r) => r.status === 'cancelled',
    'has updated_at': (r) => r.updated_at !== undefined,
  });

  pacedSleep('reservations');
}
