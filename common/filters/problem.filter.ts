import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import type { Problem } from '../dto/problem.dto.js';

@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const error = exception instanceof Error ? exception : undefined;
    const rawStatus = exception instanceof HttpException
      ? exception.getStatus()
      : error && 'status' in error ? error.status : 500;
    const status = typeof rawStatus === 'number' && Number.isInteger(rawStatus) &&
      rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
    const title = STATUS_CODES[status] ?? 'Error';
    const problem: Problem = {
      type: 'about:blank',
      title,
      status,
      detail: status >= 500 ? 'The server could not produce a valid response.' : error?.message ?? title,
      instance: request.originalUrl,
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}
