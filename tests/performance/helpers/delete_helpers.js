const AVG_ITER_SECONDS = 1.0;
const POOL_SAFETY = 1.2;
const DELETE_POOL_OVERRIDE = __ENV.K6_DELETE_POOL_SIZE || 0;

export function resolveSeedKey() {
  if (__ENV.SEED_API_KEY) return __ENV.SEED_API_KEY;
  let envText = '';
  try {
    envText = open('../../../../.env');
  } catch (e) {
    return '';
  }
  for (const line of envText.split(/\r?\n/)) {
    const match = /^SEED_API_KEY=(.*)$/.exec(line.trim());
    if (match) return match[1];
  }
  return '';
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

export function computePoolConfig(scenariosOrArray) {
  const profileList = Array.isArray(scenariosOrArray)
    ? scenariosOrArray
    : [scenariosOrArray];

  let maxVus = 0;
  let totalSeconds = 0;

  for (const scenario of profileList) {
    if (scenario.executor === 'constant-vus') {
      maxVus += scenario.vus;
      totalSeconds += parseDuration(scenario.duration);
    } else if (scenario.executor === 'ramping-vus') {
      maxVus += Math.max(
        scenario.startVUs,
        ...scenario.stages.map((s) => s.target),
      );
      for (const stage of scenario.stages) {
        totalSeconds += parseDuration(stage.duration);
      }
    }
  }

  const poolSize =
    DELETE_POOL_OVERRIDE ||
    Math.ceil((maxVus * (totalSeconds / AVG_ITER_SECONDS)) * POOL_SAFETY);

  return { poolSize, maxVus };
}