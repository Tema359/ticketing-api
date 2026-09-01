import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationResponseDto } from './dto/reservation-response.dto.js';
import { CreateReservationResult, IdempotencyRecord } from './types/create-reservation-result.js';
@Injectable()
export class ReservationsService {
  private readonly idempotencyRecords: Map<string, IdempotencyRecord> = new Map();
  private readonly reservations: ReservationResponseDto[] = [];

  private fingerprint(dto: CreateReservationDto): string {
    return JSON.stringify({
      title: dto.title,
      description: dto.description,
    });
  }

  create(reservationDto: CreateReservationDto, key: string): CreateReservationResult {
    const currentFingerprint = this.fingerprint(reservationDto);
    const existing = this.idempotencyRecords.get(key);

    if (existing) {
      if (existing.fingerprint !== currentFingerprint) {
        throw new UnprocessableEntityException(
          'Idempotency-Key was already used with a different request body',
        );
      }

      return {
        reservation: existing.reservation,
        replayed: true,
      };
    }

    const reservation = {
      id: randomUUID(),
      title: reservationDto.title,
      description: reservationDto.description,
    };

    this.reservations.push(reservation);
    this.idempotencyRecords.set(key, {
      fingerprint: currentFingerprint,
      reservation,
    });

    return {
      reservation,
      replayed: false,
    };
  }

  findOne(id: string): ReservationResponseDto {
    const reservation = this.reservations.find((item) => item.id === id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  remove(id: string): void {
    const index = this.reservations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Reservation not found');
    }
    this.reservations.splice(index, 1);
  }
}
