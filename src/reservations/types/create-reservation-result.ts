import type { ReservationResponseDto } from '../dto/reservation-response.dto.js';

export interface CreateReservationResult {
  reservation: ReservationResponseDto;
  replayed: boolean;
}

export interface IdempotencyRecord {
  fingerprint: string;
  reservation: ReservationResponseDto;
}
