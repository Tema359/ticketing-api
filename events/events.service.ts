import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventsPageResponseDto } from './dto/events-page-response.dto.js';
import { GetEventsQueryDto } from './dto/get-events-query.dto.js';

const mockData: EventsPageResponseDto = {
  items: [
    {
      id: '0a831d62-9c26-4e39-aa6d-6a7e9406cb36',
      title: 'Open Air Festival 2026',
      description: 'An evening of live music.',
    },
    {
      id: '0a831d62-9c26-4e39-aa6d-6a7e9406cb37',
      title: 'Open Air Festival 2027',
      description: 'An evening of live music.',
    },
    {
      id: '0a831d62-9c26-4e39-aa6d-6a7e9406cb38',
      title: 'Open Air Festival 2028',
      description: 'An evening of live music.',
    },
  ],
  next_cursor: null,
};

@Injectable()
export class EventsService {
  private readonly events = [...mockData.items].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  findAll(query: GetEventsQueryDto): EventsPageResponseDto {
    const rawLimit = query.limit;
    if (
      rawLimit !== undefined &&
      typeof rawLimit !== 'number' &&
      (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit))
    ) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    if (
      query.cursor !== undefined &&
      (typeof query.cursor !== 'string' ||
        query.cursor.length === 0 ||
        query.cursor.length > 512)
    ) {
      throw new BadRequestException(
        'cursor must be a non-empty pagination token',
      );
    }

    const afterId =
      query.cursor === undefined ? undefined : this.decodeCursor(query.cursor);
    const candidates =
      afterId === undefined
        ? this.events
        : this.events.filter((event) => event.id > afterId);
    const page = candidates.slice(0, limit + 1);
    const items = page.slice(0, limit);

    return {
      items,
      next_cursor:
        page.length > limit
          ? Buffer.from(
              JSON.stringify({ v: 1, id: items[items.length - 1].id }),
            ).toString('base64url')
          : null,
    };
  }

  findOne(id: string) {
    const event = this.events.find((event) => event.id === id);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private decodeCursor(cursor: string): string {
    try {
      if (cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
        throw new Error('Invalid encoding');
      }
      const buffer = Buffer.from(cursor, 'base64url');
      if (buffer.toString('base64url') !== cursor) {
        throw new Error('Non-canonical encoding');
      }
      const payload: unknown = JSON.parse(buffer.toString('utf8'));
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('v' in payload) ||
        payload.v !== 1 ||
        !('id' in payload) ||
        typeof payload.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          payload.id,
        )
      ) {
        throw new Error('Invalid payload');
      }
      return payload.id;
    } catch {
      throw new BadRequestException('Invalid pagination cursor');
    }
  }
}
