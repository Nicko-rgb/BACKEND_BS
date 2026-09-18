// Convención de los planes: un límite de 999 o más es ilimitado (Business)
const UNLIMITED_PLAN_LIMIT = 999;

export const isUnlimitedLimit = (limit: number): boolean => limit >= UNLIMITED_PLAN_LIMIT;
