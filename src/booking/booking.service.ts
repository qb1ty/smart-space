import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { acquireLock, releaseLock, generateCheckInCode, handleServiceError } from 'src/common/utils';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { buildBookingFilterQuery, checkOverlappingBookings, checkSpaceAvailability, deductUserBalance, getValidBookingForMutation } from './utils/booking-db.util';
import { calculateRescheduleDifference, calculateTotalCost, validateTimeRange } from './utils/booking-calculator.util';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name)
  private readonly RESCHEDULE_FEE = 100

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const { spaceId } = dto
    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)

    validateTimeRange(startTime, endTime)

    const lockKey = `lock:space:${spaceId}`
    let locked = false

    try {
      await acquireLock(this.cache, lockKey)
      locked = true

      const booking = await this.prisma.$transaction(async (tx) => {
        const space = await checkSpaceAvailability(tx, spaceId)
        await checkOverlappingBookings(tx, spaceId, startTime, endTime)

        const totalCost = calculateTotalCost(startTime, endTime, space.pricePerHour)
        const checkInCode = generateCheckInCode()

        await deductUserBalance(tx, userId, totalCost)

        return tx.booking.create({
          data: {
            userId, spaceId, startTime, endTime, totalCost, checkInCode, status: BookingStatus.PENDING
          },
          include: {
            space: { select: { name: true, type: true } }
          }
        })
      })

      return booking
    } catch (err: any) {
      handleServiceError(err, this.logger, "Ошибка при создании бронирование")
    } finally {
      if (locked) {
        await releaseLock(this.cache, lockKey, this.logger)
      }
    }
  }

  async findMyBookings(userId: string, query: FilterBookingDto) {
    try {
      return await this.prisma.booking.findMany({
        where: buildBookingFilterQuery(userId, query),
        include: {
          space: { select: { name: true, type: true, mapX: true, mapY: true } }
        },
        orderBy: { startTime: "desc" }
      })
    } catch (err: any) {
      handleServiceError(err, this.logger, "Ошибка при получения списка бронирования")
    }
  }

  async reschedule(userId: string, bookingId: string, dto: RescheduleBookingDto) {
    const newStart = new Date(dto.startTime)
    const newEnd = new Date(dto.endTime)
    validateTimeRange(newStart, newEnd)

    const existing = await getValidBookingForMutation(this.prisma, bookingId, userId)
    const lockKey = `lock:space:${existing.spaceId}`
    let locked = false

    try {
      await acquireLock(this.cache, lockKey)
      locked = true

      return await this.prisma.$transaction(async (tx) => {
        const space = await checkSpaceAvailability(tx, existing.spaceId)
        await checkOverlappingBookings(tx, existing.spaceId, newStart, newEnd, bookingId)

        const newCost = calculateTotalCost(newStart, newEnd, space.pricePerHour)
        const diff = calculateRescheduleDifference(existing.totalCost, newCost, this.RESCHEDULE_FEE)

        if (diff > 0) {
          await deductUserBalance(tx, userId, diff)
        } else if (diff < 0) {
          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: Math.abs(diff) } }
          })
        }

        return tx.booking.update({
          where: { id: bookingId },
          data: { startTime: newStart, endTime: newEnd, totalCost: newCost }
        })
      })
    } catch (err: any) {
      handleServiceError(err, this.logger,  `Ошибка при переносе бронирования [${bookingId}]`)
    } finally {
      if (locked) {
        await releaseLock(this.cache, lockKey, this.logger)
      }
    }
  }

  async cancel(userId: string, bookingId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const booking = await getValidBookingForMutation(tx, bookingId, userId)

        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: booking.totalCost } }
        })

        return tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED }
        })
      })
    } catch (err: any) {
      handleServiceError(err, this.logger, `Ошибка при отменен бронирования [${bookingId}]`)
    }
  }
}
