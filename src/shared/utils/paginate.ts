import type { PaginationMeta, PaginationQuery } from '../types/pagination';

// Arma limit/offset de Sequelize a partir de page/limit ya validados por paginationQuerySchema.
export const toSequelizePagination = ({ page, limit }: PaginationQuery) => ({
    limit,
    offset: (page - 1) * limit,
});

// Arma la metadata de paginación para la respuesta — va en `extra` de ApiResponse.ok.
export const toPaginationMeta = (count: number, { page, limit }: PaginationQuery): PaginationMeta => ({
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit),
});
