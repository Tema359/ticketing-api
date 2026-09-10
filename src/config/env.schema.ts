import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DB_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'Must use the postgresql:// protocol')
    .refine((value) => new URL(value).password === '', 'Must not contain a password'),
  DB_PASSWORD_FILE: z.string().min(1).default('secrets/db_password'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}
