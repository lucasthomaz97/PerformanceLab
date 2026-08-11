import { check } from 'k6';
import { getJson, postJson, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { computePoolConfig } from '../../helpers/pool_helpers.js';
import { activeProfiles } from '../../helpers/scenarios_helpers.js';
import { BASE_URL, SCENARIO, DAY_MS } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const { maxVus } = computePoolConfig(activeProfiles(SCENARIO));

  const usersRes = getJson(`${BASE_URL}/users`, { kind: 'seed' });
  let userId;
  if (usersRes.status === 200 && usersRes.json().length > 0) {
    userId = usersRes.json()[0].id;
  } else {
    const res = postJson(`${BASE_URL}/users`, {
      name: 'Res Seed User',
      email: `seed-res-user-${Date.now()}@example.com`,
    }, { kind: 'seed' });
    if (res.status !== 201) {
      throw new Error(`setup POST /users -> ${res.status}: ${res.body}`);
    }
    userId = res.json().id;
  }

  const roomRes = postJson(`${BASE_URL}/rooms`, {
    name: `Res Seed Room ${Date.now()}`,
    capacity: 2,
    price_per_night: 99.99,
  }, { kind: 'seed' });
  if (roomRes.status !== 201) {
    throw new Error(`setup POST /rooms -> ${roomRes.status}: ${roomRes.body}`);
  }

  return { userId, roomId: roomRes.json().id, maxVus };
}

export default function (data) {
  const offset = __ITER * data.maxVus + (__VU - 1);
  const base = Date.now() + offset * DAY_MS;
  const check_in = new Date(base).toISOString().slice(0, 10);
  const check_out = new Date(base + DAY_MS).toISOString().slice(0, 10);

  const response = postJson(
    `${BASE_URL}/reservations`,
    { user_id: data.userId, room_id: data.roomId, check_in, check_out },
    { endpoint: 'POST /reservations' },
  );
  logFailure('POST', `${BASE_URL}/reservations`, response);

  const reservation = parseBody(response, 201, {});

  check(response, {
    'status 201': (r) => r.status === 201,
  });

  check(reservation, {
    'has id': (r) => r.id !== undefined,
    'user_id matches': (r) => r.user_id === data.userId,
    'room_id matches': (r) => r.room_id === data.roomId,
    'status confirmed': (r) => r.status === 'confirmed',
    'created_at exists': (r) => r.created_at !== undefined,
  });

  sleepBetween();
}
