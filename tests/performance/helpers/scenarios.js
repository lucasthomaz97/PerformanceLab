const SOAK_DURATION = __ENV.K6_SOAK_DURATION || '10m';

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 3,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 30 },
      { duration: '2m', target: 30 },
      { duration: '10s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  staircase: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '45s', target: 10 },
      { duration: '45s', target: 15 },
      { duration: '45s', target: 20 },
      { duration: '45s', target: 25 },
      { duration: '45s', target: 30 },
      { duration: '45s', target: 40 },
      { duration: '45s', target: 50 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  soak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 40 },
      { duration: SOAK_DURATION, target: 40 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '15s', target: 200 },
      { duration: '1m', target: 200 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

const ALL_NAMES = ['smoke', 'load', 'staircase', 'soak', 'spike'];

export function resolveScenarioName() {
  return __ENV.K6_SCENARIO || 'load';
}

export function activeProfiles(name) {
  if (name === 'all') {
    return ALL_NAMES.map((n) => scenarios[n]);
  }
  return [scenarios[name]];
}

export function optionsScenarios(name) {
  if (name === 'all') {
    return Object.fromEntries(ALL_NAMES.map((n) => [n, scenarios[n]]));
  }
  return { [name]: scenarios[name] };
}

export { scenarios, SOAK_DURATION };