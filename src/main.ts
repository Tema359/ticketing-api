import { ConfigService } from '@nestjs/config';
import { createApplication } from './application.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await createApplication();
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });

  await app.listen(port);
}
await bootstrap();
