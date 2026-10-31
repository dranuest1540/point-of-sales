import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/shared/prisma.js';

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@kasir.local';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const cashierEmail = process.env.CASHIER_EMAIL ?? 'kasir@kasir.local';
const cashierPassword = process.env.CASHIER_PASSWORD ?? 'Kasir123!';

await prisma.user.upsert({
  where: { email: adminEmail },
  update: {},
  create: {
    name: 'Administrator',
    email: adminEmail,
    passwordHash: await bcrypt.hash(adminPassword, 12),
    role: 'ADMIN',
  },
});

await prisma.user.upsert({
  where: { email: cashierEmail },
  update: {},
  create: {
    name: 'Kasir Demo',
    email: cashierEmail,
    passwordHash: await bcrypt.hash(cashierPassword, 12),
    role: 'CASHIER',
  },
});

const samples = [
  { category: 'Minuman', products: [{ sku: 'MIN-001', name: 'Kopi Susu Gula Aren', price: 22000, stock: 24 }, { sku: 'MIN-002', name: 'Matcha Latte', price: 26000, stock: 18 }, { sku: 'MIN-003', name: 'Es Teh Lemon', price: 15000, stock: 30 }] },
  { category: 'Makanan', products: [{ sku: 'MAK-001', name: 'Roti Panggang Cokelat', price: 18000, stock: 14 }, { sku: 'MAK-002', name: 'Croissant Butter', price: 21000, stock: 4 }, { sku: 'MAK-003', name: 'Nasi Ayam Sambal', price: 32000, stock: 12 }] },
  { category: 'Snack', products: [{ sku: 'SNK-001', name: 'Kentang Goreng', price: 20000, stock: 20 }, { sku: 'SNK-002', name: 'Pisang Goreng', price: 17000, stock: 16 }] },
];

for (const group of samples) {
  const category = await prisma.category.upsert({ where: { name: group.category }, update: {}, create: { name: group.category } });
  for (const product of group.products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: { ...product, categoryId: category.id },
    });
  }
}

console.log(`Seed complete. Admin: ${adminEmail}; cashier: ${cashierEmail}`);
await prisma.$disconnect();