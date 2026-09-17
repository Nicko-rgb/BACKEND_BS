import type { Request, Response } from 'express';
import * as AuthService from '../service/auth.service';
import * as PasswordResetService from '../service/passwordReset.service';
import { toLoginAdminDto } from '../dto/loginAdmin.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const loginAdmin = async (req: Request, res: Response) => {
    const result = await AuthService.loginAdmin(req.validatedData);
    return ApiResponse.ok(res, toLoginAdminDto(result), 'Sesión iniciada exitosamente');
};

export const passwordRequest = (req: Request, res: Response) => {
    const result = PasswordResetService.requestReset(req.validatedData.email);
    return ApiResponse.ok(res, result, 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña');
};

export const passwordResetValidateToken = async (req: Request, res: Response) => {
    await PasswordResetService.validateResetToken(req.validatedData.token);
    return ApiResponse.ok(res, null, 'Enlace válido');
};

export const passwordReset = async (req: Request, res: Response) => {
    const { token, password } = req.validatedData;
    await PasswordResetService.resetPassword(token, password);
    return ApiResponse.ok(res, null, 'Contraseña actualizada correctamente');
};
