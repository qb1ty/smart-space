import { BookingStatus, Prisma, PrismaClient } from "@prisma/client";

export function buildActiveBookingFilter(from?: string, to?: string): Prisma.BookingWhereInput {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (from) {
        dateFilter.gte = new Date(from)
    }

    if (to) {
        dateFilter.lte = new Date(to)
    }

    return {
        status: { in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED] },
        ...(from || to ? { startTime: dateFilter } : {})
    }
}

export function getTotalRevenueQuery(
    prisma: PrismaClient,
    where: Prisma.BookingWhereInput
) {
    return prisma.booking.aggregate({
        _sum: { totalCost: true },
        where
    })
}

export function getBookingsCountQuery(
    prisma: PrismaClient,
    where: Prisma.BookingWhereInput
) {
   return prisma.booking.count({ where })
}

export function getTopSpacesQuery(
    prisma: PrismaClient,
    where: Prisma.BookingWhereInput
) {
     return prisma.booking.groupBy({
        by: ["spaceId"],
        _count: { id: true },
        _sum: { totalCost: true },
        where,
        orderBy: { _count: { id: "desc" } },
        take: 5
    })
}

export function getCancelledBookingsCountQuery(
    prisma: PrismaClient,
    from?: string,
    to?: string
) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (from) {
        dateFilter.gte = new Date(from)
    }

    if (to) {
        dateFilter.lte = new Date(to)
    }

    return prisma.booking.count({
        where: {
            status: BookingStatus.CANCELLED,
            ...(from || to ? { startTime: dateFilter } : {})
        }
    })
}

export function getAllSpacesQuery(prisma: PrismaClient) {
    return prisma.space.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true, pricePerHour: true },
        orderBy: { name: "asc" }
    })
}

export function getBookingForEfficiencyQuery(prisma: PrismaClient, where: Prisma.BookingWhereInput) {
    return prisma.booking.findMany({
        where,
        select: { spaceId: true, startTime: true, endTime: true, totalCost: true }
    })
}

export function getUsersActiveStatsQuery(prisma: PrismaClient, where: Prisma.BookingWhereInput) {
    return prisma.booking.groupBy({
        by: ["userId"],
        _count: { id: true },
        _sum: { totalCost: true },
        where
    })
}

export function getUsersCancelledStatsQuery(prisma: PrismaClient, from?: string, to?: string) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (from) {
        dateFilter.gte = new Date(from)
    }

    if (to) {
        dateFilter.lte = new Date(to)
    }

    return prisma.booking.groupBy({
        by: ["userId"],
        _count: { id: true },
        where: {
            status: BookingStatus.CANCELLED,
            ...(from || to ? { startTime: dateFilter } : {})
        }
    })
}

export function getAllUsersDictQuery(prisma: PrismaClient) {
    return prisma.user.findMany({
        select: { id: true, firstname: true, lastname: true, email: true }
    })
}