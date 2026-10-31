import jwt from 'jsonwebtoken';
import { prisma } from '../shared/prisma.js';
import { AppError, asyncHandler } from '../shared/errors.js';

export const authenticate = asyncHandler(async (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError(401, 'Silakan login untuk melanjutkan.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Sesi tidak valid atau sudah berakhir.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.isActive) throw new AppError(401, 'Akun tidak aktif.');
  request.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

export function authorize(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user?.role)) {
      return next(new AppError(403, 'Anda tidak memiliki akses ke fitur ini.'));
    }
    next();
  };
}