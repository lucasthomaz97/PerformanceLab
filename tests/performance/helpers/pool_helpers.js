import { activeProfiles } from './scenarios_helpers.js';

const POOL_SAFETY = Number(__ENV.K6_POOL_SAFETY) || 1.2;
const DELETE_POOL_OVERRIDE = __ENV.K6_DELETE_POOL_SIZE || 0;
const SEED_POOL_WARN = Number(__ENV.K6_SEED_POOL_WARN) || 75000;
const SEED_POOL_MAX = Number(__ENV.K6_SEED_POOL_MAX) || 150000;

const PACING_FACTORS = {
  rooms: Number(__ENV.K6_PACING_ROOMS) || 5,
  users: Number(__ENV.K6_PACING_USERS) || 2.5,
  reservations: Number(__ENV.K6_PACING_RESERVATIONS) || 1.0,
};

export function pacingFactor(kind) {
  return PACING_FACTORS[kind] || 1.0;
}

export function byIdSeedCount(name) {
  return Math.max(10, computePoolConfig(activeProfiles(name)).maxVus);
}

export function parseDuration(duration) {
  const match = /^(\d+(?:\.\d+)?)([smh])$/.exec(duration);
  if (!match) throw new Error(`unsupported k6 duration: ${duration}`);
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  return value * 3600;
}

export function computePoolConfig(scenariosOrArray, meanIterSeconds = 1.0) {
  const profileList = Array.isArray(scenariosOrArray)
    ? scenariosOrArray
    : [scenariosOrArray];

  let maxVus = 0;
  let vusSeconds = 0;

  for (const scenario of profileList) {
    if (scenario.executor === 'constant-vus') {
      maxVus += scenario.vus;
      vusSeconds += scenario.vus * parseDuration(scenario.duration);
    } else if (scenario.executor === 'ramping-vus') {
      maxVus += Math.max(
        scenario.startVUs,
        ...scenario.stages.map((s) => s.target),
      );
      let previous = scenario.startVUs;
      for (const stage of scenario.stages) {
        vusSeconds +=
          ((previous + stage.target) / 2) * parseDuration(stage.duration);
        previous = stage.target;
      }
    }
  }

  const poolSize =
    DELETE_POOL_OVERRIDE ||
    Math.ceil(((vusSeconds + maxVus) / meanIterSeconds) * POOL_SAFETY);

  return { poolSize, maxVus };
}

function rampSteps(scenario) {
  const steps = [{ t: 0, c: scenario.startVUs }];
  let t = 0;
  for (const stage of scenario.stages) {
    t += parseDuration(stage.duration);
    steps.push({ t, c: stage.target });
  }
  return steps;
}

function perVuActiveTimes(steps) {
  const times = [];
  const maxVus = Math.max(...steps.map((s) => s.c));
  for (let i = 1; i <= maxVus; i++) {
    let start = null;
    for (let k = 1; k < steps.length; k++) {
      const a = steps[k - 1];
      const b = steps[k];
      if (b.c > a.c && a.c < i && b.c >= i) {
        start = a.t + ((i - a.c) * (b.t - a.t)) / (b.c - a.c);
        break;
      }
    }
    if (start === null) start = 0;

    let stop = null;
    for (let k = 1; k < steps.length; k++) {
      const a = steps[k - 1];
      const b = steps[k];
      if (b.c < a.c && a.c >= i && b.c < i) {
        stop = a.t + ((a.c - i) * (b.t - a.t)) / (a.c - b.c);
        break;
      }
    }
    if (stop === null) stop = steps[steps.length - 1].t;
    times.push(stop - start);
  }
  return times;
}

export function computePerVuConfig(scenariosOrArray, meanIterSeconds = 1.0) {
  const profileList = Array.isArray(scenariosOrArray)
    ? scenariosOrArray
    : [scenariosOrArray];

  let maxVus = 0;
  const activeTimes = [];

  for (const scenario of profileList) {
    if (scenario.executor === 'constant-vus') {
      const duration = parseDuration(scenario.duration);
      maxVus += scenario.vus;
      for (let i = 0; i < scenario.vus; i++) {
        activeTimes.push(duration);
      }
    } else if (scenario.executor === 'ramping-vus') {
      const times = perVuActiveTimes(rampSteps(scenario));
      maxVus += times.length;
      activeTimes.push(...times);
    }
  }

  // Each VU gets a slice sized to its own scheduled active time, so the
  // long-running VUs that ramping profiles start first never exhaust their
  // rows mid-run: slice = ceil(active / meanIterSeconds x POOL_SAFETY) + 1,
  // where the +1 reserves the in-flight iteration during gracefulRampDown.
  const sliceSizes = activeTimes.map(
    (active) => Math.ceil((active / meanIterSeconds) * POOL_SAFETY) + 1,
  );
  const poolSize =
    DELETE_POOL_OVERRIDE ||
    sliceSizes.reduce((sum, size) => sum + size, 0);

  return { poolSize, maxVus, sliceSizes };
}

export function computeSliceLayout({ poolSize, sliceSizes }) {
  const n = sliceSizes.length;
  let sizes;

  const needed = sliceSizes.reduce((sum, size) => sum + size, 0);
  if (poolSize >= needed) {
    sizes = sliceSizes.slice();
  } else {
    // Explicit K6_DELETE_POOL_SIZE smaller than the estimated need: shrink
    // proportionally (min 1 per VU) so the id array is still fully consumed.
    sizes = new Array(n);
    const remainders = new Array(n);
    let allocated = 0;
    for (let i = 0; i < n; i++) {
      const exact = (poolSize * sliceSizes[i]) / needed;
      const base = Math.max(1, Math.floor(exact));
      sizes[i] = base;
      allocated += base;
      remainders[i] = { i, frac: exact - base };
    }
    remainders.sort((x, y) => y.frac - x.frac);
    for (let r = 0; allocated < poolSize && r < n; r++) {
      sizes[remainders[r].i] += 1;
      allocated += 1;
    }
  }

  const sliceOffsets = new Array(n);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    sliceOffsets[i] = offset;
    offset += sizes[i];
  }

  return { sliceSizes: sizes, sliceOffsets };
}

export function guardSeedPoolSize(poolSize, scenarioName, overridden) {
  if (overridden || poolSize <= SEED_POOL_WARN) {
    return;
  }

  if (poolSize > SEED_POOL_MAX) {
    throw new Error(
      `seed pool for ${scenarioName} = ~${poolSize.toLocaleString('en-US')} rows, ` +
      `exceeds K6_SEED_POOL_MAX=${SEED_POOL_MAX}. Seeding this much is impractical. ` +
      `Use a milder profile for delete/cancel tests, set -e K6_DELETE_POOL_SIZE=<n> for an explicit pool, ` +
      `raise the cap with -e K6_SEED_POOL_MAX=<n>, or raise the K6_PACING_* factor to slow VUs and shrink the pool.`,
    );
  }

  console.warn(
    `seed pool for ${scenarioName} = ~${poolSize.toLocaleString('en-US')} rows, ` +
    `above K6_SEED_POOL_WARN=${SEED_POOL_WARN}. Seeding this may take a while and lots of RAM. ` +
    `Set -e K6_DELETE_POOL_SIZE=<n> for a smaller pool, or raise the K6_PACING_* factor to slow VUs and shrink it.`,
  );
}