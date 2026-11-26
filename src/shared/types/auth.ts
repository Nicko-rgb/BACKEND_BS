/**
 * Forma de `req.user` — en dos tiempos, ambos dentro de un solo middleware de
 * ruta (`resolveAuthorization`, shared/middlewares):
 *   1. Internamente delega en `verificarTokenAuth` (shared/middlewares) para
 *      decodificar el JWT, que deja acá solo lo mínimo que viaja firmado:
 *      user_id, role_id, app, jti. El JWT deliberadamente NO trae
 *      permissions/scope_level — si los llevara, cambiar los
 *      permisos de un rol no aplicaría hasta que cada usuario renueve token
 *      (ver decisión de "vigencia inmediata" del refactor de roles).
 *   2. Con el token ya validado, resuelve en caliente contra dsg_bss_role
 *      (key + scope_level) / user_permissions (set efectivo) y completa acá
 *      role/scope_level/permissions.
 * Después comprueba los permisos indicados en `resolveAuthorization(...permisos)`.
 * Sin argumentos solo exige una sesión válida. El acceso a la entidad concreta
 * se comprueba en el service vía shared/utils/accessScope (lee las tablas de
 * asignación explícita con el user_id, no viaja en req.user).
 */
export interface AuthenticatedUser {
    jti?: string;
    user_id: number;
    name?: string;
    email?: string;
    /** FK a dsg_bss_role — etiqueta + scope + menú. Los permisos salen de user_permissions. */
    role_id: number;
    /** Key del rol ('cliente'|'empleado'|'administrador'|'super_admin'|'system') — resuelta, solo display/logs. */
    role: string;
    /** Alcance de datos del rol: 1=system, 2=super_admin, 3=administrador, 4=empleado, null=no aplica. Resuelto. */
    scope_level: number | null;
    /** Resuelto por resolveAuthorization — vacío hasta que corra ese middleware. */
    permissions: string[];
    tenant_id?: string;
    app?: 'admin' | 'booking';
}
