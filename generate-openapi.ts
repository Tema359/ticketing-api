import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { stringify } from 'yaml';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './openapi.js';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const document = createOpenApiDocument(app);

  await mkdir('openapi', { recursive: true });
  await writeFile('openapi/openapi.yaml', stringify(document), 'utf8');
  await app.close();
}

await generateOpenApi();
