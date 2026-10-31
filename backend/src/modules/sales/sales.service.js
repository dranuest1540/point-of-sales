import { AppError } from '../../shared/errors.js';
import { cache } from '../../shared/cache.js';
import { prisma } from '../../shared/prisma.js';

export async function createSale(input, cashierId, database = prisma) {
  const quantities = new Map();
  for (const item of input.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const sale = await database.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
    });
    if (products.length !== quantities.size) throw new AppError(404, 'Satu atau lebih produk tidak tersedia.');

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id);
      if (product.stock < quantity) throw new AppError(409, `Stok ${product.name} tersisa ${product.stock}.`);
      const unitPrice = Number(product.price);
      return { product, quantity, unitPrice, lineTotal: Math.round(unitPrice * quantity * 100) / 100 };
    });
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
    if (input.discount > subtotal) throw new AppError(400, 'Diskon tidak boleh melebihi subtotal.');
    const total = Math.round((subtotal - input.discount) * 100) / 100;
    if (input.amountPaid < total) throw new AppError(400, 'Jumlah pembayaran kurang dari total transaksi.');

    for (const line of lines) {
      const updated = await tx.product.updateMany({
        where: { id: line.product.id, stock: { gte: line.quantity }, isActive: true },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count !== 1) throw new AppError(409, `Stok ${line.product.name} berubah. Silakan coba kembali.`);
    }

    return tx.sale.create({
      data: {
        receiptNumber: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        cashierId,
        subtotal,
        discount: input.discount,
        total,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        change: Math.round((input.amountPaid - total) * 100) / 100,
        items: {
          create: lines.map(({ product, quantity, unitPrice, lineTotal }) => ({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity,
            unitPrice,
            lineTotal,
          })),
        },
      },
      include: { items: true, cashier: { select: { name: true } } },
    });
  }, { isolationLevel: 'Serializable' });

  await cache.clearProducts();
  return sale;
}