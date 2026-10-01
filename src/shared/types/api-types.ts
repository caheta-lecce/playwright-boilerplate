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
