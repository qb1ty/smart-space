import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleServiceError } from 'src/common/utils';
import { buildActiveBookingFilter, getAllSpacesQuery, getAllUsersDictQuery, getBookingForEfficiencyQuery, getBookingsCountQuery, getCancelledBookingsCountQuery, getTopSpacesQuery, getTotalRevenueQuery, getUsersActiveStatsQuery, getUsersCancelledStatsQuery } from './utils/reports-db.util';
import { GetReportQueryDto } from './dto/get-report-query.dto';
import { calculateCancellationRate, calculateHours, calculateOccupancyRate } from './utils/reports-calculator.util';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(private prisma: PrismaService) {}

  async getDashboardStats(query: GetReportQueryDto) {
    const { to, from } = query

    try {
      const activeFilter = buildActiveBookingFilter(from, to)

      const [revenueResult, totalBookings, topSpacesRaw, cancelledBookings] = await this.prisma.$transaction([
        getTotalRevenueQuery(this.prisma, activeFilter),
        getBookingsCountQuery(this.prisma, activeFilter),
        getTopSpacesQuery(this.prisma, activeFilter),
        getCancelledBookingsCountQuery(this.prisma, from, to)
      ])

      const totalRevenue = revenueResult._sum.totalCost || 0

      const spaceIds = topSpacesRaw.map((item) => item.spaceId)
      const spacesInfo = await this.prisma.space.findMany({
        where: { id: { in: spaceIds } },
        select: { id: true, name: true, type: true, pricePerHour: true }
      })

      const topSpaces = topSpacesRaw.map((raw) => {
        const space = spacesInfo.find((s) => s.id === raw.spaceId)

        return {
          spaceId: raw.spaceId,
          name: space?.name || "Удаленное пространство",
          type: space?.type || "UNKNOWN",
          pricePerHour: space?.pricePerHour || 0,
          bookingsCount: raw._count.id,
          revenueGenerated: raw._sum.totalCost || 0
        }
      })

      const averageCheck = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0

      return {
        period: { from: from || "Начало времен", to: to || "Текущий момент" },
        overview: { totalRevenue, totalBookings, cancelledBookings, averageCheck },
        topSpaces: topSpaces
      }
    } catch (err: any) {
      handleServiceError(err, this.logger, "Ошибка при генерации аналитического отчета")
    }
  }

  async getWorkspacesEfficiency(query: GetReportQueryDto) {
    const { from, to } = query

    try {
      const activeFilter = buildActiveBookingFilter(from, to)

      const [spaces, bookings] = await this.prisma.$transaction([
        getAllSpacesQuery(this.prisma),
        getBookingForEfficiencyQuery(this.prisma, activeFilter)
      ])

      const report = spaces.map((space) => {
        const spaceBookings = bookings.filter((b) => b.spaceId === space.id)

        const totalRevenue = spaceBookings.reduce((acc, val) => acc + val.totalCost, 0)
        const bookedHours = spaceBookings.reduce((acc, val) => acc + calculateHours(val.startTime, val.endTime), 0)

        return {
          spaceId: space.id,
          name: space.name,
          type: space.type,
          pricePerHour: space.pricePerHour,
          bookingCount: spaceBookings.length,
          bookedHours: Math.round(bookedHours),
          revenue: totalRevenue,
          occupancyRate: calculateOccupancyRate(bookedHours)
        }
      })

      return report.sort((a, b) => a.revenue - a.revenue)
    } catch (err: any) {
      handleServiceError(err, this.logger, "Ошибка при генерации отчета по пространствам")
    }
  }

  async getUsersActivity(query: GetReportQueryDto) {
    const { from, to } = query

    try {
      const activeFilter = buildActiveBookingFilter(from, to)

      const [activeStats, cancelledStats, users] = await this.prisma.$transaction([
        getUsersActiveStatsQuery(this.prisma, activeFilter),
        getUsersCancelledStatsQuery(this.prisma, from, to),
        getAllUsersDictQuery(this.prisma)
      ])

      const activityReport = users.map((user) => {
        const active = activeStats.find((s) => s.userId === user.id)
        const cancelled = cancelledStats.find((s) => s.userId === user.id)

        const bookingCount = active?._count.id || 0
        const cancelledCount = cancelled?._count.id || 0
        const totalAttempts = bookingCount + cancelledCount

        return {
          userId: user.id,
          name: `${user.firstname} ${user.lastname}`.trim() || user.email,
          email: user.email,
          totalSpent: active?._sum.totalCost || 0,
          successfulBookings: bookingCount,
          cancelledBookings: cancelledCount,
          cancellationRate: calculateCancellationRate(cancelledCount, totalAttempts)
        }
      })

      return activityReport
        .filter((u) => u.successfulBookings > 0 || u.cancelledBookings > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent)
    } catch (err: any) {
      handleServiceError(err, this.logger, "Ошибка при генерации отчета активности пользователей")
    }
  }
}
