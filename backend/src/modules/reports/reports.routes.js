import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

function dateFilter(query) {
  const startDate = query.startDate ? new Date(String(query.startDate)) : undefined;
  const endValue = query.endDate ? String(query.endDate) : undefined;
  const endDate = endValue
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(endValue) ? `${endValue}T23:59:59.999Z` : endValue)
    : undefined;

  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    throw new AppError(400, 'Rentang tanggal tidak valid.');
  }

  return {
    status: 'PAID',
    ...(startDate || endDate ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
  };
}

router.get('/summary', asyncHandler(async (request, response) => {
  const where = dateFilter(request.query);
  const [totals, sales, groupedItems, products] = await Promise.all([
    prisma.sale.aggregate({ where, _count: { _all: true }, _sum: { total: true } }),
    prisma.sale.findMany({ where, select: { id: true, total: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.saleItem.groupBy({
      by: ['productId', 'productName', 'productSku'],
      where: { sale: where },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, stock: true, lowStockAt: true },
    }),
  ]);
  const daily = new Map();
  for (const sale of sales) {
    const date = sale.createdAt.toISOString().slice(0, 10);
    daily.set(date, (daily.get(date) ?? 0) + Number(sale.total));
  }
  response.json({
    data: {
      totalRevenue: Number(totals._sum.total ?? 0),
      transactionCount: totals._count._all,
      averageOrderValue: totals._count._all ? Number(totals._sum.total ?? 0) / totals._count._all : 0,
      topProducts: groupedItems.map((item) => ({
        ...item,
        quantity: item._sum.quantity,
        revenue: Number(item._sum.lineTotal ?? 0),
      })),
      lowStockProducts: products.filter((product) => product.stock <= product.lowStockAt),
      dailySales: [...daily].map(([date, revenue]) => ({ date, revenue })),
    },
  });
}));

router.get('/sales.csv', asyncHandler(async (request, response) => {
  const sales = await prisma.sale.findMany({
    where: dateFilter(request.query),
    include: { cashier: { select: { name: true } }, items: true },
    orderBy: { createdAt: 'desc' },
  });
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['No. Struk', 'Tanggal', 'Kasir', 'Produk', 'Jumlah Item', 'Subtotal', 'Diskon', 'Total', 'Metode Bayar'],
    ...sales.map((sale) => [
      sale.receiptNumber,
      sale.createdAt.toISOString(),
      sale.cashier.name,
      sale.items.map((item) => `${item.productName} x${item.quantity}`).join('; '),
      sale.items.reduce((sum, item) => sum + item.quantity, 0),
      sale.subtotal,
      sale.discount,
      sale.total,
      sale.paymentMethod,
    ]),
  ];
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', 'attachment; filename="laporan-penjualan.csv"');
  response.send(`\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`);
}));

export default router;