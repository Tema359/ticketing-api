import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { validate } from './config/env.schema.js';
import type { Env } from './config/env.schema.js';
import { createTypeOrmOptions } from './database/typeorm.options.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configReader: ConfigService<Env, true>) =>
        createTypeOrmOptions({
          NODE_ENV: configReader.get('NODE_ENV', { infer: true }),
          PORT: configReader.get('PORT', { infer: true }),
          DB_URL: configReader.get('DB_URL', { infer: true }),
          DB_PASSWORD_FILE: configReader.get('DB_PASSWORD_FILE', { infer: true }),
        }),
    }),
    DatabaseModule,
    EventsModule,
    ReservationsModule,
  ],
})
export class AppModule {}
