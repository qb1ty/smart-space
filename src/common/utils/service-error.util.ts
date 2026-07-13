import {
    BadRequestException,
    ConflictException,
    HttpException,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from "@nestjs/common"
import { Prisma } from "@prisma/client"

/**
 * Глобальный обработчик ошибок для слоя сервисов
 * Логирует техническую ошибку и превращает её в понятное HTTP-исключение
 */
export function handleServiceError(
    error: Error,
    logger: Logger,
    defaultMessage = "Внутренняя ошибка севера при обработке запроса"
): never {
    if (error instanceof HttpException) {
        throw error
    }

    // Логирование для меня
    logger.error(`${defaultMessage}: ${error.message}`, error.stack)

    // Обработка известных ошибок Prisma (PrismaClientKnownRequestError)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                // Нарушения уникальности (Unique constraint failed)
                // @ts-ignore: Игнорируем проверку типов для нестандартного мета-поля Prisma
                const target = (error.meta?.driverAdapterError?.cause?.constraint?.fields).join(", ") || ""
                throw new ConflictException(`Запись с значением (${target}) уже существует.`)

            case "P2025":
                // Запись не найдена (Record to update/delete not found)
                throw new NotFoundException("Запрашиваемая запись не найдена в базе данных.")

            case "P2003":
                // Ошибка целостности ключа (Foreign key constraint failed)
                throw new BadRequestException("Нарушения связей данных: указанный связанный объект не существует.")

            case "P2014":
                // Нарушения целостности отношения
                throw new BadRequestException("Действие невозможно: запись связанна с другими данными.")

            default:
                // В случи если неизвестен код Prisma, отдаем базовый ответ
                throw new BadRequestException(`Ошибка базы данных [${error.code}]: запрос отклонен.`)
        }
    }

    // Обработка ошибок валидации Prisma (неверный формат типов, которые прошли через DTO)
    if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException("Некорректная структура данных для запроса в базу. ")
    }

    // На всякии случи
    throw new InternalServerErrorException(defaultMessage)
}