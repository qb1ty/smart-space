import { Controller, Get, Post, Body, UseGuards, Param, Patch, Query } from '@nestjs/common';
import { AuthGuard } from 'src/common/guard';
import { SessionInfo } from 'src/auth/decorators/session-user.decorator';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Controller("booking")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @SessionInfo() session: { userId: string, role: string },
    @Body() dto: CreateBookingDto
  ) {
    return this.bookingService.create(session.userId, dto)
  }

  @Get()
  @UseGuards(AuthGuard)
  async findMyBookings(
    @SessionInfo() session: { userId: string, role: string },
    @Query() dto: FilterBookingDto
  ) {
    return this.bookingService.findMyBookings(session.userId, dto)
  }

  @Patch(":id/reschedule")
  @UseGuards(AuthGuard)
  async reschedule(
    @SessionInfo() session: { userId: string, role: string },
    @Param("id") id: string,
    @Body() dto: RescheduleBookingDto
  ) {
    return this.bookingService.reschedule(session.userId, id, dto)
  }

  @Patch(":id/cancel")
  @UseGuards(AuthGuard)
  async cancel(
    @SessionInfo() session: { userId: string, role: string },
    @Param("id") id: string,
  ) {
    return this.bookingService.cancel(session.userId, id)
  }
}
