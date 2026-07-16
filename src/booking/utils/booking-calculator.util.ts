import { BadRequestException } from "@nestjs/common"

export function validateTimeRange(startTime: Date, endTime: Date): void {
    const now = new Date()

    if (startTime >= endTime) {
        throw new BadRequestException("Время начала бронирования должны быть раньше времени окончания")
    }

    if (startTime < now) {
        throw new BadRequestException("Нельзя бронировать пространства в прошлом времени")
    }
}

export function calculateTotalCost(startTime: Date, endTime: Date, pricePerHour: number): number {
    const durationHour = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    return Math.ceil(durationHour * pricePerHour)
}

export function calculateRescheduleDifference(
    oldCost: number,
    newCost: number,
    rescheduleFee: number = 100
) {
    return (newCost- oldCost) + rescheduleFee
}