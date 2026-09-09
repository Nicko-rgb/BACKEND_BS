import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as CountryRepository from '../repository/country.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { Country } from '../database/models';

// ── Todos los países (activos e inactivos), sin paginar — catálogo chico, listado de administración ───
export const list = async () => {
    return cacheUtility.withCache('system:countries', {}, async () => {
        const rows = await CountryRepository.findAll();
        const referencesCount = await CountryRepository.countReferencesByIds(rows.map((row) => row.country_id));
        return { rows, referencesCount };
    });
};

// ── Solo países activos — endpoint público, sin paginar, para selects/lógica de negocio ───
export const listActive = async () => {
    return cacheUtility.withCache('system:countries:active', {}, () => CountryRepository.findAllActive());
};

// ── Crea un país nuevo — bloqueado si ya existe uno con el mismo código ISO ───
export const create = async (data: Omit<InferCreationAttributes<Country>, 'user_create'>, user: AuthenticatedUser | null | undefined) => {
    const existing = await CountryRepository.findByIsoCountry(data.iso_country);
    if (existing) throw new ConflictError(`Ya existe un país con el código ISO "${data.iso_country}"`);

    const created = await CountryRepository.create({ ...data, user_create: user!.user_id });
    await cacheUtility.delByPattern('system:countries:*');
    return created;
};

// Actualiza un país existente — bloqueado si el código ISO ya pertenece a otro. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<Country>>) => {
    const country = await CountryRepository.findById(id);
    if (!country) throw new NotFoundError('País no encontrado');

    if (data.iso_country) {
        const existing = await CountryRepository.findByIsoCountry(data.iso_country);
        // country_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.country_id) !== id) {
            throw new ConflictError(`Ya existe un país con el código ISO "${data.iso_country}"`);
        }
    }

    const updated = await CountryRepository.update(country, data);
    await cacheUtility.delByPattern('system:countries:*');
    return updated;
};

// Elimina un país — bloqueado si tiene registros asociados (empresas, tipos de pago o usuarios)
export const remove = async (id: number) => {
    const country = await CountryRepository.findById(id);
    if (!country) throw new NotFoundError('País no encontrado');

    const referencesCount = await CountryRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar el país porque tiene registros asociados');
    }

    await CountryRepository.remove(country);
    await cacheUtility.delByPattern('system:countries:*');
};
