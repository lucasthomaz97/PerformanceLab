import { optionsScenarios, resolveScenarioName } from './scenarios_helpers.js';

const ERROR_RATE = __ENV.K6_ERROR_RATE || 0.01;
const P95_MS = __ENV.K6_P95_MS || 500;

export function loadOptions({ setupTimeout } = {}) {
  const options = {
    scenarios: optionsScenarios(resolveScenarioName()),
    noConnectionReuse: true,
    thresholds: {
      'http_req_failed{kind:load}': [{ threshold: `rate<${ERROR_RATE}`, abortOnFail: false }],
      'http_req_duration{kind:load}': [{ threshold: `p(95)<${P95_MS}`, abortOnFail: false }],
      'http_req_waiting{kind:load}': [{ threshold: `p(95)<${P95_MS}`, abortOnFail: false }],
    },
  };

  if (setupTimeout) {
    options.setupTimeout = setupTimeout;
  }

  return options;
}
