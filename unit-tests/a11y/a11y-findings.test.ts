// Unit tests for the aggregated a11y findings helpers. Run with `npm run test:unit`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { A11yFinding, A11yScanSummary, ScanAxe } from '../../lib/a11y/findings.ts';
import { expectNoAccessibilityViolations, trackA11yScan } from '../../lib/a11y/findings.ts';

const violating: A11yScanSummary = {
  label: 'home',
  violations: [{ id: 'color-contrast', impact: 'serious', nodes: 3 }],
};

void describe('expectNoAccessibilityViolations', () => {
  void it('passes with no findings and with clean scans', () => {
    expectNoAccessibilityViolations([]);
    expectNoAccessibilityViolations([{ label: 'home', violations: [] }]);
  });

  void it('names every violating state with rule id, impact and node count', () => {
    const findings: A11yFinding[] = [
      violating,
      { label: 'clean', violations: [] },
      {
        label: 'cart',
        violations: [
          { id: 'label', impact: 'critical', nodes: 1 },
          { id: 'link-name', impact: 'serious', nodes: 5 },
        ],
      },
    ];
    assert.throws(
      () => expectNoAccessibilityViolations(findings),
      (error: Error) => {
        assert.match(error.message, /2 of 3 state\(s\)/);
        assert.match(error.message, /home: color-contrast \[serious\] x3 node\(s\)/);
        assert.match(
          error.message,
          /cart: label \[critical\] x1 node\(s\), link-name \[serious\] x5/
        );
        assert.doesNotMatch(error.message, /clean:/);
        return true;
      }
    );
  });
});

void describe('trackA11yScan', () => {
  void it('records the findings and forces a non-fatal scan', async () => {
    const calls: unknown[] = [];
    const scanAxe: ScanAxe = (label, options) => {
      calls.push(options);
      return Promise.resolve({ ...violating, label });
    };
    const findings: A11yFinding[] = [];
    await trackA11yScan(scanAxe, findings, 'home', { include: '#main' });
    await trackA11yScan(scanAxe, findings, 'cart');
    assert.deepEqual(
      findings.map((finding) => finding.label),
      ['home', 'cart']
    );
    assert.deepEqual(findings[0]?.violations, violating.violations);
    assert.deepEqual(calls[0], { include: '#main', failOnViolation: false });
    assert.deepEqual(calls[1], { failOnViolation: false });
  });

  void it('does not throw when the scan has violations', async () => {
    const findings: A11yFinding[] = [];
    await trackA11yScan(() => Promise.resolve(violating), findings, 'home');
    assert.equal(findings.length, 1);
  });
});
