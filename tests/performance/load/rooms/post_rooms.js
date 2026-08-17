import { check } from 'k6';
import { postJson, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { BASE_URL, RUN_ID } from '../../helpers/config.js';

export const options = loadOptions();

export default function () {
  const name = `Load Test Room ${RUN_ID}-${__VU}-${__ITER}`;
  const capacity = 2;
  const price_per_night = 149.99;

  const payload = {
    name,
    capacity,
    price_per_night,
    description: 'Load test room',
  };

  const response = postJson(`${BASE_URL}/rooms`, payload, { endpoint: 'POST /rooms' });
  logFailure('POST', `${BASE_URL}/rooms`, response);

  const room = parseBody(response, 201, {});

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  if (response.status !== 201) return;

  check(room, {
    'has id': (r) => r.id !== undefined,
    'name matches': (r) => r.name === name,
    'capacity matches': (r) => r.capacity === capacity,
    'price_per_night matches': (r) => Number(r.price_per_night) === price_per_night,
    'created_at exists': (r) => r.created_at !== undefined,
  });

  sleepBetween();
}
