import { z } from 'zod';

export const EnvironmentSchema = z
  .object({
    ENV: z.enum(['local', 'test']).default('local'),
    BASE_URL: z.url().default('http://127.0.0.1:4173'),
  })
  .superRefine((value, context) => {
    if (value.ENV === 'local' && value.BASE_URL !== 'http://127.0.0.1:4173') {
      context.addIssue({
        code: 'custom',
        path: ['BASE_URL'],
        message: 'Local mode uses http://127.0.0.1:4173; set ENV=test for your own application.',
      });
    }
  });

export const UserSchema = z.object({ displayName: z.string().trim().min(1) });
export type User = z.infer<typeof UserSchema>;
