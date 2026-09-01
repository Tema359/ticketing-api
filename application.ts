import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { ProblemFilter } from './common/filters/problem.filter.js';
import { createOpenApiDocument } from './openapi.js';

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new ProblemFilter());
  app.use(json());
  app.use(OpenApiValidator.middleware({
    apiSpec: resolve('openapi/openapi.yaml'),
    validateRequests: { coerceTypes: false, allowUnknownQueryParameters: false },
    validateResponses: { coerceTypes: false },
    ignoreUndocumented: false,
    ignorePaths: /^\/api(?:\/|$|-json$|-yaml$)/,
  }));
  SwaggerModule.setup('api', app, () => createOpenApiDocument(app));
  await app.init();
  return app;
}
