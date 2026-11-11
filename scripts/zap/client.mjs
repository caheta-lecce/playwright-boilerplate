// Minimal ZAP API client shared by the zap:* scripts. It follows the conventions of
// scripts/configure-zap-baseline.mjs and reset-zap-session.mjs: ZAP_PROXY_URL (default
// http://127.0.0.1:8080) and the optional ZAP_KEY sent as the API key.
export const DEFAULT_ZAP_URL = 'http://127.0.0.1:8080';

export class ZapUnreachableError extends Error {
  constructor(baseUrl, cause) {
    super(
      `Could not reach the ZAP daemon at ${baseUrl}. Start it first (see docs/zap/zap-proxy-scan.md, ` +
        'step 1) or set ZAP_PROXY_URL if it is listening elsewhere.',
      { cause }
    );
    this.name = 'ZapUnreachableError';
  }
}

export function zapConfigFromEnv(env = process.env) {
  return {
    baseUrl: (env.ZAP_PROXY_URL ?? DEFAULT_ZAP_URL).replace(/\/$/, ''),
    apiKey: env.ZAP_KEY || undefined,
  };
}

/** `fetchImpl` is injectable so the error paths can be tested without a daemon. */
export function createZapClient({ baseUrl, apiKey }, fetchImpl = fetch) {
  async function call(component, operation, params = {}) {
    const query = new URLSearchParams(params);
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/JSON/${component}/${operation}/?${query}`, {
        headers: apiKey ? { 'X-ZAP-API-Key': apiKey } : undefined,
      });
    } catch (cause) {
      throw new ZapUnreachableError(baseUrl, cause);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `ZAP rejected the request (HTTP ${response.status}). Set ZAP_KEY to the API key configured in the daemon.`
      );
    }
    if (!response.ok) {
      throw new Error(`ZAP ${component}/${operation} returned HTTP ${response.status}`);
    }
    const body = await response.json();
    if (body.code) throw new Error(`ZAP ${component}/${operation}: ${body.message ?? body.code}`);
    return body;
  }
  return { baseUrl, call };
}
