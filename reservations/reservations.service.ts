import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationResponseDto } from './dto/reservation-response.dto.js';

@Injectable()
export class ReservationsService {
  private readonly reservations: ReservationResponseDto[] = [];

  create(data: CreateReservationDto, key: string): ReservationResponseDto {
    const reservation = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
    };
    this.reservations.push(reservation);
    return reservation;
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
