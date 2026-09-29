import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(private readonly dataSource: DataSource) {}

  async getDatabaseTime(): Promise<Date> {
    const rows = await this.dataSource.query<Array<{ database_time: Date }>>(
      'SELECT CURRENT_TIMESTAMP AS database_time',
    );
    return rows[0].database_time;
  }
}
