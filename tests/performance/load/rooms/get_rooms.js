import { check } from 'k6';
import { getJson, postJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = loadOptions();

export function setup() {
  const res = getJson(`${BASE_URL}/rooms`);
  if (res.status === 200 && res.json().length === 0) {
    postJson(`${BASE_URL}/rooms`, {
      name: 'Seed Room',
      capacity: 2,
      price_per_night: 99.99,
    });
  }
}

export default function () {
  const response = getJson(`${BASE_URL}/rooms`, { endpoint: 'GET /rooms' });
  logFailure('GET', `${BASE_URL}/rooms`, response);

  const rooms = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => r.body.length > 0,
  });

  checkListFields(rooms, 'rooms', ['id', 'name', 'capacity', 'price_per_night', 'is_active', 'created_at', 'updated_at']);

  sleepBetween();
}
