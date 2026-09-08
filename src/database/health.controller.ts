import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Problem } from '../common/dto/problem.dto.js';
import { DatabaseService } from './database.service.js';
import { DatabaseHealthResponseDto } from './dto/database-health-response.dto.js';
import { HealthResponseDto } from './dto/health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Check application health' })
  @ApiOkResponse({ type: HealthResponseDto })
  checkApplication(): HealthResponseDto {
    return {
      status: 'ok',
      uptime_seconds: process.uptime(),
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Check database connectivity' })
  @ApiOkResponse({ type: DatabaseHealthResponseDto })
  @ApiInternalServerErrorResponse({
    description: 'PostgreSQL is unavailable',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  async checkDatabase(): Promise<DatabaseHealthResponseDto> {
    const databaseTime = await this.database.getDatabaseTime();
    return {
      status: 'ok',
      database_time: databaseTime.toISOString(),
      uptime_seconds: process.uptime(),
    };
  }
}
