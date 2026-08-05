import http from 'k6/http';
import { computePoolConfig } from './delete_helpers.js';
import { activeProfiles, resolveScenarioName } from './scenarios_helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

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
      tags: { endpoint: `POST /seed/${kind}` },
    },
  );

  if (response.status !== 201) {
    throw new Error(`seed POST /seed/${kind} -> ${response.status}: ${response.body}`);
  }

  return response.json().ids;
}

export function sliceForVus(ids, maxVus) {
  const sliceSize = Math.floor(ids.length / maxVus);
  console.info(`seeded ${ids.length} rows, slice per VU: ${sliceSize}`);
  return { ids, sliceSize };
}

export function seedPool(kind) {
  const { poolSize, maxVus } = computePoolConfig(activeProfiles(resolveScenarioName()));
  const ids = seedViaRoute(kind, poolSize);
  return sliceForVus(ids, maxVus);
}
