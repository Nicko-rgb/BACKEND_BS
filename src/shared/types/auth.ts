/**
 * Forma del payload decodificado del JWT — lo que verificarTokenAuth deja en
 * `req.user`. Los campos opcionales (company_ids, tenant_id) solo aplican al
 * token del panel admin, no al del portal cliente — ver AuthService (auth,
 * aún no portado).
 */
export interface AuthenticatedUser {
    jti?: string;
    user_id: number;
    name?: string;
    email?: string;
    /** Clasificador de display — 'cliente' | 'empleado' | 'administrador' | 'super_admin' | 'system' */
    role: string;
    permissions: string[];
    company_ids?: number[];
    tenant_id?: string;
    app?: 'admin' | 'booking';
}
