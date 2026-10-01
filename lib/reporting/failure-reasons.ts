import type { FailureDetail, FailureKey } from './failure-types';

// Using SCREAMING_SNAKE_CASE for a global constant
export const FAILURE_REASONS: Record<FailureKey, FailureDetail> = {
  400: { category: 'Functional', severity: 'P2', message: 'Bad request — check payload structure' },
  401: {
    category: 'Security',
    severity: 'P1',
    message: 'Auth token expired/missing — re-auth needed',
  },
  403: { category: 'Security', severity: 'P1', message: 'Forbidden — lacks required permissions' },
  404: {
    category: 'Functional',
    severity: 'P2',
    message: 'Endpoint not found — check URL/Environment',
  },
  408: {
    category: 'Network',
    severity: 'P2',
    message: 'Server-side timeout — upstream overloaded',
  },
  409: { category: 'Functional', severity: 'P2', message: 'Conflict — resource already exists' },
  422: {
    category: 'Functional',
    severity: 'P2',
    message: 'Unprocessable entity — validation failed',
  },
  429: { category: 'Infrastructure', severity: 'P3', message: 'Rate limited — too many requests' },
  500: {
    category: 'Infrastructure',
    severity: 'P1',
    message: 'Internal server error — check app logs',
  },
  502: {
    category: 'Infrastructure',
    severity: 'P1',
    message: 'Bad gateway — upstream invalid response',
  },
  503: {
    category: 'Infrastructure',
    severity: 'P1',
    message: 'Service unavailable — dependency down',
  },
  504: {
    category: 'Infrastructure',
    severity: 'P1',
    message: 'Gateway timeout — upstream timed out',
  },
  timeout: {
    category: 'Network',
    severity: 'P2',
    message: 'No response received — server unresponsive',
  },
  assertion: {
    category: 'Functional',
    severity: 'P2',
    message:
      'Locator resolved but content/value differs from expected — check test data or app UI copy, not network logs',
  },
  validation: {
    category: 'Functional',
    severity: 'P2',
    message: 'Zod schema validation failed — check test data / input format',
  },
  setup: {
    category: 'Infrastructure',
    severity: 'P1',
    message:
      'Test setup crashed before the test body ran (e.g. missing/invalid auth storage state) — check [Before Hooks] output, not network logs',
  },
  closed: {
    category: 'Infrastructure',
    severity: 'P2',
    message:
      'Page/context/browser closed mid-action — likely a crash, a prior step tearing down early, or an explicit close() elsewhere in the test; check the trace, not network logs',
  },
  a11y: {
    category: 'Accessibility',
    severity: 'P2',
    message:
      'axe-core found accessibility violations; inspect the axe-<label> JSON attachment for affected elements and remediation guidance',
  },
  unknown: {
    category: 'Network',
    severity: 'P3',
    message: 'Unexpected failure — check network logs',
  },
} satisfies Record<FailureKey, FailureDetail>;
