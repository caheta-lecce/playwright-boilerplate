export type FailureKey =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503
  | 504
  | 'timeout'
  | 'assertion'
  | 'validation'
  | 'setup'
  | 'closed'
  | 'a11y'
  | 'unknown';

export interface FailureDetail {
  readonly category: 'Functional' | 'Infrastructure' | 'Security' | 'Network' | 'Accessibility';
  readonly message: string;
  readonly severity: 'P1' | 'P2' | 'P3';
}
