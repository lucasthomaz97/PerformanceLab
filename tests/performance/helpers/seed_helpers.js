import http from 'k6/http';
import { computePoolConfig } from './pool_helpers.js';
import { activeProfiles, resolveScenarioName } from './scenarios_helpers.js';
import { getJson, postJson } from './request_helpers.js';
import { BASE_URL, RUN_ID, isoDateFromOffset } from './config.js';

const ONE_ROW_PREFIX = {
  rooms: 'Seed Room',
  users: 'Seed User',
};

const ENV_CANDIDATES = [
  '../../../.env',
  '../../../../.env',
];

function readEnvText() {
  for (const candidate of ENV_CANDIDATES) {
    try {
      const content = open(candidate);
      if (content) return content;
    } catch (e) {
      // try next candidate
    }
  }
  return '';
}

function extractSeedKey(envText) {
  for (const line of envText.split(/\r?\n/)) {
    const match = /^SEED_API_KEY=(.*)$/.exec(line.trim());
    if (match) return match[1];
  }
  return '';
}

function resolveSeedKey() {
  if (__ENV.SEED_API_KEY) return __ENV.SEED_API_KEY;
  return extractSeedKey(readEnvText());
}

const SEED_API_KEY = resolveSeedKey();

export function seedViaRoute(kind, quantity) {
  const response = http.post(
    `${BASE_URL}/seed/${kind}`,
    JSON.stringify({ quantity }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Seed-Key': SEED_API_KEY,
      },
      tags: { kind: 'seed', endpoint: `POST /seed/${kind}` },
    },
  );

  if (response.status !== 201) {
    throw new Error(`seed POST /seed/${kind} -> ${response.status}: ${response.body}`);
  }

  return response.json().ids;
}

export function sliceForVus(ids, maxVus) {
  const sliceSize = Math.floor(ids.length / maxVus);
  if (sliceSize === 0) {
    throw new Error(
      `pool size ${ids.length} < maxVus ${maxVus}; raise K6_DELETE_POOL_SIZE`,
    );
  }
  console.info(`seeded ${ids.length} rows, slice per VU: ${sliceSize}`);
  return { ids, sliceSize };
}

export function seedPool(kind) {
  const { poolSize, maxVus } = computePoolConfig(activeProfiles(resolveScenarioName()));
  const ids = seedViaRoute(kind, poolSize);
  return sliceForVus(ids, maxVus);
}

function seedRow(kind, prefix, i) {
  const payload = kind === 'users'
    ? { name: `${prefix} ${i}`, email: `seed-${RUN_ID}-${i}@example.com` }
    : { name: `${prefix} ${RUN_ID}-${i}`, capacity: 2, price_per_night: 99.99 };
  const res = postJson(`${BASE_URL}/${kind}`, payload);
  if (res.status !== 201) {
    throw new Error(`setup POST /${kind} -> ${res.status}: ${res.body}`);
  }
  return res.json().id;
}

export function ensureOneIfEmpty(kind) {
  const res = getJson(`${BASE_URL}/${kind}`);
  if (res.status === 200 && res.json().length === 0) {
    seedRow(kind, ONE_ROW_PREFIX[kind], 0);
  }
}

export function ensureRows(kind, count, prefix) {
  const res = getJson(`${BASE_URL}/${kind}`);
  const existing = res.status === 200 ? res.json().length : 0;
  for (let i = existing; i < count; i++) {
    seedRow(kind, prefix, i);
  }
}

export function seedReservationGraph(kind, count) {
  const manyIds = [];
  const manyPrefix = kind === 'users' ? 'User' : 'Room';
  const singlePrefix = kind === 'users' ? 'Room' : 'User';

  for (let i = 0; i < count; i++) {
    const res = postJson(`${BASE_URL}/${kind}`, kind === 'users'
      ? { name: `Res Seed ${manyPrefix} ${RUN_ID}-${i}`, email: `seed-res-${RUN_ID}-${i}@example.com` }
      : { name: `Res Seed ${manyPrefix} ${RUN_ID}-${i}`, capacity: 2, price_per_night: 99.99 });
    if (res.status !== 201) {
      throw new Error(`setup POST /${kind} -> ${res.status}: ${res.body}`);
    }
    manyIds.push(res.json().id);
  }

  const singleRes = postJson(`${BASE_URL}/${kind === 'users' ? 'rooms' : 'users'}`, kind === 'users'
    ? { name: `Res Seed ${singlePrefix} ${RUN_ID}`, capacity: 2, price_per_night: 99.99 }
    : { name: `Res Seed ${singlePrefix} ${RUN_ID}`, email: `seed-res-${RUN_ID}@example.com` });
  if (singleRes.status !== 201) {
    throw new Error(`setup POST /${kind === 'users' ? 'rooms' : 'users'} -> ${singleRes.status}: ${singleRes.body}`);
  }
  const singleId = singleRes.json().id;

  for (let i = 0; i < manyIds.length; i++) {
    const checkIn = isoDateFromOffset(i);
    const checkOut = isoDateFromOffset(i + 1);
    const res = postJson(`${BASE_URL}/reservations`, kind === 'users'
      ? { user_id: manyIds[i], room_id: singleId, check_in: checkIn, check_out: checkOut }
      : { user_id: singleId, room_id: manyIds[i], check_in: checkIn, check_out: checkOut });
    if (res.status !== 201) {
      throw new Error(`setup POST /reservations -> ${res.status}: ${res.body}`);
    }
  }

  return manyIds;
}
