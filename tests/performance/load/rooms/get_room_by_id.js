import { check } from 'k6';
import { getJson, postJson, nextIdFromVus, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const RUN_ID = Date.now();

export const options = loadOptions();

export function setup() {
  const res = getJson(`${BASE_URL}/rooms`);
  const count = res.status === 200 ? res.json().length : 0;
  if (count >= 10) return;
  for (let i = count; i < 10; i++) {
    postJson(`${BASE_URL}/rooms`, {
      name: `Seed Room ${RUN_ID}-${i}`,
      capacity: 2,
      price_per_night: 99.99,
    });
  }
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
