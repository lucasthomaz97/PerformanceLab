import { check } from 'k6';
import { putJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { byIdSeedCount } from '../../helpers/pool_helpers.js';
import { ensureRows } from '../../helpers/seed_helpers.js';
import { BASE_URL, RUN_ID, SCENARIO } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const count = byIdSeedCount(SCENARIO);
  ensureRows('rooms', count, 'Seed Room');
  return { count };
}

export default function (data) {
  const id = nextIdFromVus(data.count);
  const name = `Load Test Room ${RUN_ID}-${__VU}-${__ITER}`;
  const capacity = 4;
  const price_per_night = 199.99;

  const response = putJson(
    `${BASE_URL}/rooms/${id}`,
    {
      name,
      capacity,
      price_per_night,
      description: 'Updated load test room',
    },
    { endpoint: `PUT /rooms/${id}` },
  );
  logFailure('PUT', `${BASE_URL}/rooms/${id}`, response);

  const room = parseBody(response, 200, {});

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(room, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'name matches': (r) => r.name === name,
    'capacity matches': (r) => r.capacity === capacity,
    'has updated_at': (r) => r.updated_at !== undefined,
  });

  sleepBetween();
}
