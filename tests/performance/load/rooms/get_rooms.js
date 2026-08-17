import { check } from 'k6';
import { getJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { ensureOneIfEmpty } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  ensureOneIfEmpty('rooms');
}

export default function () {
  const response = getJson(`${BASE_URL}/rooms`, { endpoint: 'GET /rooms' });
  logFailure('GET', `${BASE_URL}/rooms`, response);

  const rooms = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  checkListFields(rooms, 'rooms', ['id', 'name', 'capacity', 'price_per_night', 'is_active', 'created_at', 'updated_at']);

  sleepBetween();
}
