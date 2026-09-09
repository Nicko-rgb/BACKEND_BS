/**
 * Forma de `req.user` — en dos tiempos, ambos dentro de un solo middleware de
 * ruta (`resolveAuthorization`, modules/auth/middlewares):
 *   1. Internamente delega en `verificarTokenAuth` (shared/middlewares) para
 *      decodificar el JWT, que deja acá solo lo mínimo que viaja firmado:
 *      user_id, role_id, app, jti. El JWT deliberadamente NO trae
 *      permissions/company_ids/scope_level — si los llevara, cambiar los
 *      permisos de un rol no aplicaría hasta que cada usuario renueve token
 *      (ver decisión de "vigencia inmediata" del refactor de roles).
 *   2. Con el token ya validado, resuelve en caliente contra dsg_bss_role/
 *      role_permission/user_permissions/user_company (cacheado, invalidable)
 *      y completa acá role/scope_level/permissions/company_ids.
 * Una ruta protegida solo necesita encadenar `resolveAuthorization` — no
 * hace falta (ni corresponde) usar `verificarTokenAuth` aparte.
 */
export interface AuthenticatedUser {
    jti?: string;
    user_id: number;
    name?: string;
    email?: string;
    /** FK a dsg_bss_role — fuente de verdad para permisos/menú/scope. */
    role_id: number;
    /** Key del rol ('cliente'|'empleado'|'administrador'|'super_admin'|'system') — resuelta, solo display/logs. */
    role: string;
    /** Alcance de datos del rol: 1=system, 2=super_admin, 3=administrador, 4=empleado, null=no aplica. Resuelto. */
    scope_level: number | null;
    /** Resuelto por resolveAuthorization — vacío hasta que corra ese middleware. */
    permissions: string[];
    company_ids?: number[];
    tenant_id?: string;
    app?: 'admin' | 'booking';
}
