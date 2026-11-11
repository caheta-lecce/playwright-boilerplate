import { Faker, en } from '@faker-js/faker';

// Inputs and expected values for the example specs. Specs import test data from here instead of
// declaring it inline; reuse an existing key before adding a new one.
export const exampleData = {
  emptyDisplayName: '',
  emptyDisplayNameError: 'Enter a display name.',
} as const;

// Generated data is seeded so a failing run can be reproduced: set TEST_DATA_SEED to replay a
// sequence. The default seed is fixed, so runs are deterministic unless you choose otherwise.
// The sequence is per worker process and follows call order: keep each generated value
// self-contained in its own test and never depend on a value another test produced.
const DEFAULT_SEED = 20260101;
const seed = Number(process.env['TEST_DATA_SEED'] ?? DEFAULT_SEED);
const generator = new Faker({ locale: [en], seed });

/** A realistic display name ("First Last"): plain letters and one space, safe to type and assert. */
export function buildDisplayName(): string {
  return `${generator.person.firstName()} ${generator.person.lastName()}`.replace(
    /[^A-Za-z ]/g,
    ''
  );
}
