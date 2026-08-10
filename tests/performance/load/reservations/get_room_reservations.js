import { check } from 'k6';
import { getJson, checkListFields, logFailure, parseBody, sleepBetween } from '../../helpers/request_helpers.js';
import { loadOptions } from '../../helpers/options_helpers.js';
import { seedReservationGraph } from '../../helpers/seed_helpers.js';
import { BASE_URL } from '../../helpers/config.js';

export const options = loadOptions();

export function setup() {
  return { roomIds: seedReservationGraph('rooms', 10) };
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
