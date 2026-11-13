// Convención de los planes: NULL significa ilimitado. Un 0 explícito significa "no incluido".
export const isUnlimitedLimit = (limit: number | null): limit is null => limit === null;
