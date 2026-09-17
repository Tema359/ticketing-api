import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import type { Env } from '../config/env.schema.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

async function readPassword(path: string): Promise<string> {
  const password = (await readFile(path, 'utf8')).trim();

  if (password.length === 0) {
    throw new Error(`Database password file is empty: ${path}`);
  }

  return password;
}

export function createTypeOrmOptions(env: Env): PostgresConnectionOptions {
  const databaseUrl = new URL(env.DB_URL);

  return {
    type: 'postgres',
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 5432),
    database: decodeURIComponent(databaseUrl.pathname.slice(1)),
    username: decodeURIComponent(databaseUrl.username),
    password: () => readPassword(env.DB_PASSWORD_FILE),
    applicationName: 'ticketing-api',
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    entities: [join(currentDirectory, '..', '**', '*.entity.js')],
    migrations: [join(currentDirectory, '..', 'migrations', '*.js')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    synchronize: false,
    logging: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  };
}
