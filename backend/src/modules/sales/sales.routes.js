import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { createSale } from './sales.service.js';

const router = Router();
const checkoutInput = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive().max(999) })).min(1),
  discount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'QRIS']).default('CASH'),
});
router.use(authenticate);

router.post('/', asyncHandler(async (request, response) => {
  const input = checkoutInput.parse(request.body);
  const sale = await createSale(input, request.user.id);
  response.status(201).json({ data: sale });
}));

router.get('/', asyncHandler(async (request, response) => {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 20));
  const startDate = request.query.startDate ? new Date(String(request.query.startDate)) : undefined;
  const endDate = request.query.endDate ? new Date(String(request.query.endDate)) : undefined;
  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    throw new AppError(400, 'Rentang tanggal tidak valid.');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new AppError(400, 'Tanggal awal tidak boleh melewati tanggal akhir.');
  }
  const where = {
    ...(request.user.role === 'ADMIN' ? {} : { cashierId: request.user.id }),
    ...(startDate || endDate ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
    ...(request.query.status ? { status: String(request.query.status) } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.sale.findMany({ where, include: { items: true, cashier: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.sale.count({ where }),
  ]);
  response.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/:id', asyncHandler(async (request, response) => {
  const data = await prisma.sale.findFirst({
    where: { id: request.params.id, ...(request.user.role === 'ADMIN' ? {} : { cashierId: request.user.id }) },
    include: { items: true, cashier: { select: { name: true } } },
  });
  if (!data) throw new AppError(404, 'Transaksi tidak ditemukan.');
  response.json({ data });
}));

export default router;