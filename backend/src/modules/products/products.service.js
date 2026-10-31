import { cache } from '../../shared/cache.js';
import { prisma } from '../../shared/prisma.js';

const includeCategory = { category: { select: { id: true, name: true } } };

export async function listProducts({ page, limit, search, categoryId, lowStock, status, role }) {
  const key = `products:${JSON.stringify({ page, limit, search, categoryId, lowStock, status, role })}`;
  const cached = await cache.get(key);
  if (cached) return cached;

  const where = {
    ...(status === 'all' && role === 'ADMIN' ? {} : { isActive: true }),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(lowStock ? { stock: { lte: 5 } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: includeCategory, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  const result = { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  await cache.set(key, result);
  return result;
}

export async function getProduct(id, role) {
  const product = await prisma.product.findUnique({ where: { id }, include: includeCategory });
  return product && (product.isActive || role === 'ADMIN') ? product : null;
}

export async function createProduct(input) {
  const product = await prisma.product.create({ data: input, include: includeCategory });
  await cache.clearProducts();
  return product;
}

export async function updateProduct(id, input) {
  const product = await prisma.product.update({ where: { id }, data: input, include: includeCategory });
  await cache.clearProducts();
  return product;
}

export async function archiveProduct(id) {
  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  await cache.clearProducts();
  return product;
}