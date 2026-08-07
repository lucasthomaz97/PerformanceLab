import { check } from 'k6';
import { getJson, postJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { BASE_URL, RUN_ID, isoDateFromOffset } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  const roomIds = [];
  for (let i = 0; i < 10; i++) {
    const room = postJson(`${BASE_URL}/rooms`, {
      name: `Res Seed Room ${RUN_ID}-${i}`,
      capacity: 2,
      price_per_night: 99.99,
    });
    if (room.status !== 201) {
      throw new Error(`setup POST /rooms -> ${room.status}: ${room.body}`);
    }
    roomIds.push(room.json().id);
  }

  const user = postJson(`${BASE_URL}/users`, {
    name: `Res Seed User ${RUN_ID}`,
    email: `seed-res-${RUN_ID}@example.com`,
  });
  if (user.status !== 201) {
    throw new Error(`setup POST /users -> ${user.status}: ${user.body}`);
  }
  const userId = user.json().id;

  for (let i = 0; i < roomIds.length; i++) {
    const checkIn = isoDateFromOffset(i);
    const checkOut = isoDateFromOffset(i + 1);
    const res = postJson(`${BASE_URL}/reservations`, {
      user_id: userId,
      room_id: roomIds[i],
      check_in: checkIn,
      check_out: checkOut,
    });
    if (res.status !== 201) {
      throw new Error(`setup POST /reservations -> ${res.status}: ${res.body}`);
    }
  }

  return { roomIds };
}

export default function (data) {
  const id = data.roomIds[((__VU - 1) % data.roomIds.length)];

  const response = getJson(`${BASE_URL}/reservations/room/${id}`, {
    endpoint: `GET /reservations/room/${id}`,
  });
  logFailure('GET', `${BASE_URL}/reservations/room/${id}`, response);

  const reservations = parseBody(response, 200, []);

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  checkListFields(reservations, 'reservations', [
    'id', 'user_id', 'room_id', 'check_in', 'check_out', 'status', 'created_at', 'updated_at',
  ]);

  sleepBetween();
}
