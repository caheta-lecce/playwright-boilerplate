export interface HttpStatusCode {
  readonly Status200_Ok: 200;
  readonly Status201_Created: 201;
  readonly Status204_No_Content: 204;
  readonly Status400_Bad_Request: 400;
  readonly Status401_Unauthorized: 401;
  readonly Status403_Forbidden: 403;
  readonly Status404_Not_Found: 404;
  readonly Status422_Unprocessable_Content: 422;
  readonly Status500_Internal_Server_Error: 500;
}

/**
 * Strict HTTP method contract.
 * Uses readonly to prevent mutation at runtime.
 */
export interface HttpMethod {
  readonly GET: 'GET';
  readonly POST: 'POST';
  readonly PUT: 'PUT';
  readonly PATCH: 'PATCH';
  readonly DELETE: 'DELETE';
}

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
