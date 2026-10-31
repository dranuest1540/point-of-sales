import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../shared/prisma.js';
import { AppError, asyncHandler } from '../../shared/errors.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const credentials = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
});

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

router.post('/register', asyncHandler(async (request, response) => {
  const input = credentials.parse(request.body);
  if (!input.name) throw new AppError(400, 'Nama wajib diisi.');
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12),
      role: 'CASHIER',
    },
    select: { id: true, name: true, email: true, role: true },
  });
  response.status(201).json({ data: { user, token: issueToken(user) } });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const input = credentials.omit({ name: true }).parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user?.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Email atau password tidak sesuai.');
  }
  response.json({
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: issueToken(user),
    },
  });
}));

router.get('/me', authenticate, (request, response) => response.json({ data: request.user }));

export default router;