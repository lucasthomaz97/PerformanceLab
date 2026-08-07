import { check } from 'k6';
import { getJson, postJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { BASE_URL, RUN_ID, isoDateFromOffset } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const userIds = [];
  for (let i = 0; i < 10; i++) {
    const user = postJson(`${BASE_URL}/users`, {
      name: `Res Seed User ${RUN_ID}-${i}`,
      email: `seed-res-${RUN_ID}-${i}@example.com`,
    });
    if (user.status !== 201) {
      throw new Error(`setup POST /users -> ${user.status}: ${user.body}`);
    }
    userIds.push(user.json().id);
  }

  const room = postJson(`${BASE_URL}/rooms`, {
    name: `Res Seed Room ${RUN_ID}`,
    capacity: 2,
    price_per_night: 99.99,
  });
  if (room.status !== 201) {
    throw new Error(`setup POST /rooms -> ${room.status}: ${room.body}`);
  }
  const roomId = room.json().id;

  for (let i = 0; i < userIds.length; i++) {
    const checkIn = isoDateFromOffset(i);
    const checkOut = isoDateFromOffset(i + 1);
    const res = postJson(`${BASE_URL}/reservations`, {
      user_id: userIds[i],
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
    });
    if (res.status !== 201) {
      throw new Error(`setup POST /reservations -> ${res.status}: ${res.body}`);
    }
  }

  return { userIds };
}

export default function (data) {
  const id = data.userIds[((__VU - 1) % data.userIds.length)];

  const response = getJson(`${BASE_URL}/reservations/user/${id}`, {
    endpoint: `GET /reservations/user/${id}`,
  });
  logFailure('GET', `${BASE_URL}/reservations/user/${id}`, response);

  const reservations = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  checkListFields(reservations, 'reservations', [
    'id', 'user_id', 'room_id', 'check_in', 'check_out', 'status', 'created_at', 'updated_at',
  ]);

  sleepBetween();
}
