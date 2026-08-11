import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from './general_helpers.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const LOAD_TAG = { kind: 'load' };
const FAILURE_LOG_LIMIT = Number(__ENV.K6_FAILURE_LOG_LIMIT) || 20;
let failuresLogged = 0;
let failuresTotal = 0;
let suppressionAnnounced = false;

function stringifyBody(body) {
  return body === null || body === undefined ? null : JSON.stringify(body);
}

function mergeTags(tags) {
  return tags ? { ...LOAD_TAG, ...tags } : { ...LOAD_TAG };
}

export function postJson(url, body, tags) {
  return http.post(url, stringifyBody(body), { headers: JSON_HEADERS, tags: mergeTags(tags) });
}

export function putJson(url, body, tags) {
  return http.put(url, stringifyBody(body), { headers: JSON_HEADERS, tags: mergeTags(tags) });
}

export function patchJson(url, body, tags) {
  return http.patch(url, stringifyBody(body), { headers: JSON_HEADERS, tags: mergeTags(tags) });
}

export function getJson(url, tags) {
  return http.get(url, { tags: mergeTags(tags) });
}

export function delJson(url, tags) {
  return http.del(url, null, { tags: mergeTags(tags) });
}

export function logFailure(method, url, response) {
  if (response.status < 400) {
    return;
  }

  failuresTotal += 1;

  if (failuresLogged >= FAILURE_LOG_LIMIT) {
    if (!suppressionAnnounced) {
      suppressionAnnounced = true;
      console.error(
        `failure log limit reached (${FAILURE_LOG_LIMIT}); ` +
        `suppressing further logs (${failuresTotal} total failures so far)`,
      );
    }
    return;
  }

  failuresLogged += 1;
  console.error(`${method} ${url} -> ${response.status}: ${response.body}`);
}

export function parseBody(response, expectedStatus, fallback) {
  return response.status === expectedStatus ? response.json() : fallback;
}

export function sleepBetween(min = 500, max = 1500) {
  sleep(randomIntBetween(min, max) / 1000);
}

export function nextIdFromVus(n) {
  return ((__VU - 1) % n) + 1;
}

export function checkListFields(list, label, fields) {
  const checks = {
    [`has ${label}`]: (l) => l.length > 0,
  };
  for (const field of fields) {
    checks[`has ${field}`] = (l) => l.every((item) => item[field] !== undefined);
  }
  return check(list, checks);
}
