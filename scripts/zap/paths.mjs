import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

/** Raw alerts pulled from the daemon (git-ignored, see .gitignore `reports/`). */
export const ALERTS_FILE = path.join(root, 'reports', 'zap', 'alerts.json');

/**
 * Findings a human reviewed and accepted. docs/zap/zap-baseline.json is NOT this: it pins the ZAP
 * version, add-ons and rule configuration, not findings.
 */
export const ACCEPTED_FILE = path.join(root, 'docs', 'zap', 'zap-accepted-findings.json');
