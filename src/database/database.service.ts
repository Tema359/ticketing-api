import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import type { Env } from '../config/env.schema.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly passwordFile: string;
  private readonly pool: Pool;

  constructor(config: ConfigService<Env, true>) {
    this.passwordFile = config.get('DB_PASSWORD_FILE', { infer: true });
    const databaseUrl = new URL(config.get('DB_URL', { infer: true }));

    this.pool = new Pool({
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 5432),
      database: decodeURIComponent(databaseUrl.pathname.slice(1)),
      user: decodeURIComponent(databaseUrl.username),
      password: () => this.readPassword(),
    });

    this.pool.on('error', (error) => {
      this.logger.error('Unexpected error from an idle PostgreSQL client', error.stack);
    });
  }

  async getDatabaseTime(): Promise<Date> {
    const result = await this.pool.query<{ database_time: Date }>(
      'SELECT CURRENT_TIMESTAMP AS database_time',
    );
    return result.rows[0].database_time;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private async readPassword(): Promise<string> {
    const password = (await readFile(this.passwordFile, 'utf8')).trim();
    if (password.length === 0) {
      throw new Error(`Database password file is empty: ${this.passwordFile}`);
    }
    return password;
  }
}
