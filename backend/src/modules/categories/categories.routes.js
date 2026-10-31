import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (request, response) => {
  const data = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  response.json({ data });
}));

router.post('/', authorize('ADMIN'), asyncHandler(async (request, response) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(60) }).parse(request.body);
  const data = await prisma.category.create({ data: { name } });
  response.status(201).json({ data });
}));

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (request, response) => {
  await prisma.category.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));

export default router;