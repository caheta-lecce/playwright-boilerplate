import type { HttpMethod, HttpStatusCode } from '@shared/types';

/**
 * HTTP status codes used across API tests.
 * Uses `satisfies` to enforce type safety without losing literal inference.
 */
export const HTTP_STATUS = {
  Status200_Ok: 200,
  Status201_Created: 201,
  Status204_No_Content: 204,
  Status400_Bad_Request: 400,
  Status401_Unauthorized: 401,
  Status403_Forbidden: 403,
  Status404_Not_Found: 404,
  Status422_Unprocessable_Content: 422,
  Status500_Internal_Server_Error: 500,
} satisfies HttpStatusCode;

/**
 * HTTP methods used across API tests.
 * Uses `satisfies` to enforce type safety without losing literal inference.
 */
export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} satisfies HttpMethod;
