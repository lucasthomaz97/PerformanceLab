import { resolveScenarioName } from './scenarios_helpers.js';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
export const RUN_ID = Date.now();
export const SCENARIO = resolveScenarioName();
export const DAY_MS = 86400000;

export function isoDateFromOffset(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}
