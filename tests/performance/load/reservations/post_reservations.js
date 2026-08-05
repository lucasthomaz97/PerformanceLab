import { check } from 'k6';
import { getJson, postJson, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { computePoolConfig } from '../../helpers/delete_helpers.js';
import { activeProfiles, resolveScenarioName } from '../../helpers/scenarios_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = resolveScenarioName();
const DAY_MS = 86400000;

export const options = loadOptions();

function isoDateFromOffset(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

export function setup() {
  const { maxVus } = computePoolConfig(activeProfiles(SCENARIO));

  let userId;
  let roomId;

  const usersRes = getJson(`${BASE_URL}/users`);
  if (usersRes.status === 200 && usersRes.json().length > 0) {
    userId = usersRes.json()[0].id;
  } else {
    const res = postJson(`${BASE_URL}/users`, {
      name: 'Res Seed User',
      email: `seed-res-user-${Date.now()}@example.com`,
    });
    if (res.status !== 201) {
      throw new Error(`setup POST /users -> ${res.status}: ${res.body}`);
    }
    userId = res.json().id;
  }

  const roomsRes = getJson(`${BASE_URL}/rooms`);
  if (roomsRes.status === 200 && roomsRes.json().length > 0) {
    roomId = roomsRes.json()[0].id;
  } else {
    const res = postJson(`${BASE_URL}/rooms`, {
      name: `Res Seed Room ${Date.now()}`,
      capacity: 2,
      price_per_night: 99.99,
    });
    if (res.status !== 201) {
      throw new Error(`setup POST /rooms -> ${res.status}: ${res.body}`);
    }
    roomId = res.json().id;
  }

  return { userId, roomId, maxVus };
}

export default function (data) {
  const offset = __ITER * data.maxVus + (__VU - 1);
  const check_in = isoDateFromOffset(offset);
  const check_out = isoDateFromOffset(offset + 1);

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
