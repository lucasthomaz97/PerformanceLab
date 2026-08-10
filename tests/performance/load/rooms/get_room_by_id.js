import { check } from 'k6';
import { getJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { ensureRows } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  ensureRows('rooms', 10, 'Seed Room');
}

export default function () {
  const id = nextIdFromVus(10);

  const response = getJson(`${BASE_URL}/rooms/${id}`, { endpoint: `GET /rooms/${id}` });
  logFailure('GET', `${BASE_URL}/rooms/${id}`, response);

  const room = parseBody(response, 200, {});

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  check(room, {
    'has id': (r) => r.id !== undefined,
    'id matches': (r) => r.id === id,
    'has name': (r) => r.name !== undefined,
    'has capacity': (r) => r.capacity !== undefined,
    'has price_per_night': (r) => r.price_per_night !== undefined,
  });

  sleepBetween();
}
