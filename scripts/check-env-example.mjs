import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { envSchema } from '../src/config/env.schema.ts';

const schemaKeys = Object.keys(envSchema.shape).sort();
const fileKeys = Object.keys(
  parse(readFileSync(new URL('../.env.example', import.meta.url), 'utf8')),
).sort();

const missing = schemaKeys.filter((k) => !fileKeys.includes(k));
const extra = fileKeys.filter((k) => !schemaKeys.includes(k));

if (missing.length || extra.length) {
  if (missing.length) {
    console.error(`✗ Missing from .env.example: ${missing.join(', ')}`);
  }
  if (extra.length) {
    console.error(`✗ Unexpected in .env.example (not defined in the schema): ${extra.join(', ')}`);
  }
  process.exit(1);
}
console.log(`.env.example matches envSchema (${schemaKeys.length} variables).`);
