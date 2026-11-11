## What and why

<!-- One or two sentences: what changes and the reason. Link the issue if there is one. -->

## Checklist

- [ ] `npm run type:check`, `npm run lint`, `npm run format:check` pass
- [ ] `npm run guidelines:check` and `npm run test:unit` pass
- [ ] `npm run ai:skills:check` passes (after editing a skill, `npm run ai:skills:sync` was run and the generated files committed)
- [ ] `npm test` passes (or the affected specs were run, and the output is noted below)
- [ ] New or changed tests carry exactly one suite tag (`@smoke` or `@regression`)
- [ ] Rules or hooks that let a violation through were tightened (see "Close review gaps" in the guidelines)
- [ ] No credentials, project URLs or customer data were added

## Notes for the reviewer

<!-- Risks, follow-ups, anything verified manually. -->
