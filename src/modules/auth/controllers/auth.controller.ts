import type { Request, Response } from 'express';
import * as AuthService from '../service/auth.service';
import { toLoginAdminDto } from '../dto/loginAdmin.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const loginAdmin = async (req: Request, res: Response) => {
    const result = await AuthService.loginAdmin(req.validatedData);
    return ApiResponse.ok(res, toLoginAdminDto(result), 'Sesión iniciada exitosamente');
};
