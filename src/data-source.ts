import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readEnvironment } from './config/env.schema.js';
import { createTypeOrmOptions } from './database/typeorm.options.js';

export default new DataSource(createTypeOrmOptions(readEnvironment()));
