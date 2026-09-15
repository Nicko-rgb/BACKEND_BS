import { createRouter } from '../../../shared/utils/createRouter';
import userRoutes from './user.route';
import userManageRoutes from './userManage.route';
import userPermissionRoutes from './userPermission.route';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', usersRoutes),
// sin conocer las subrutas internas. Cada recurso nuevo del módulo se suma
// acá con su propio *.route.ts.
router.use('/users/manage', userManageRoutes);
router.use('/users', userRoutes);
router.use('/users', userPermissionRoutes);

export default router;
