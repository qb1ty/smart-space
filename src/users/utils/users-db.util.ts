import { BookingStatus, Prisma, PrismaClient } from "@prisma/client";

export const SAFE_USER_SELECT = {
    id: true,
    email: true,
    firstname: true,
    lastname: true,
    role: true,
    balance: true,
    isActive: true,
    createdAt: true
} satisfies Prisma.UserSelect

export function getSafeUserByIdQuery(prisma: PrismaClient, id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: SAFE_USER_SELECT
    })
}

export function getAllUSersQuery(prisma: PrismaClient, activeOnly: boolean) {
    return prisma.user.findMany({
        where: activeOnly ? { isActive: activeOnly } : {},
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: "desc" }
    })
}

export function incrementUserBalanceQuery(prisma: PrismaClient, userId: string, amount: number) {
    return prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
        select: SAFE_USER_SELECT
    })
}


export function deactivateUserQuery(prisma: PrismaClient, userId: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: SAFE_USER_SELECT
    })
}

export function cancelUserFutureBookingsQuery(prisma: PrismaClient, userId: string) {
    return prisma.booking.updateMany({
        where: {
            userId: userId,
            status: { in: [BookingStatus.PENDING, BookingStatus.ACTIVE] },
            endTime: { gt: new Date() }
        },
        data: { status: BookingStatus.CANCELLED }
    })
}