import assert from 'node:assert/strict';
import test from 'node:test';
import { createSale } from '../src/modules/sales/sales.service.js';

function databaseWith(product, updateCount = 1) {
  const calls = { decrements: [], sale: null };
  const tx = {
    product: {
      findMany: async () => [product],
      updateMany: async (args) => {
        calls.decrements.push(args);
        return { count: updateCount };
      },
    },
    sale: {
      create: async (args) => {
        calls.sale = args;
        return args.data;
      },
    },
  };
  return {
    calls,
    $transaction: (operation) => operation(tx),
  };
}

const sampleProduct = { id: 'product-1', name: 'Kopi', sku: 'MIN-001', price: 30000, stock: 5, isActive: true };

test('checkout merges duplicate products and records the correct change', async () => {
  const database = databaseWith(sampleProduct);
  const sale = await createSale({
    items: [{ productId: 'product-1', quantity: 2 }, { productId: 'product-1', quantity: 1 }],
    discount: 10000,
    amountPaid: 90000,
    paymentMethod: 'CASH',
  }, 'cashier-1', database);

  assert.equal(sale.total, 80000);
  assert.equal(database.calls.decrements[0].data.stock.decrement, 3);
  assert.equal(database.calls.sale.data.items.create[0].quantity, 3);
  assert.equal(database.calls.sale.data.change, 10000);
});

test('checkout rejects insufficient stock before recording a sale', async () => {
  const database = databaseWith(sampleProduct);
  await assert.rejects(
    createSale({ items: [{ productId: 'product-1', quantity: 6 }], discount: 0, amountPaid: 200000, paymentMethod: 'CASH' }, 'cashier-1', database),
    (error) => error.status === 409,
  );
  assert.equal(database.calls.decrements.length, 0);
  assert.equal(database.calls.sale, null);
});

test('checkout rejects payment below the payable total', async () => {
  const database = databaseWith(sampleProduct);
  await assert.rejects(
    createSale({ items: [{ productId: 'product-1', quantity: 1 }], discount: 0, amountPaid: 10000, paymentMethod: 'CASH' }, 'cashier-1', database),
    (error) => error.status === 400,
  );
  assert.equal(database.calls.decrements.length, 0);
});

test('checkout rejects a discount above the subtotal before reducing stock', async () => {
  const database = databaseWith(sampleProduct);
  await assert.rejects(
    createSale({ items: [{ productId: 'product-1', quantity: 1 }], discount: 30001, amountPaid: 0, paymentMethod: 'CASH' }, 'cashier-1', database),
    (error) => error.status === 400,
  );
  assert.equal(database.calls.decrements.length, 0);
  assert.equal(database.calls.sale, null);
});

test('checkout detects a stock change between read and conditional update', async () => {
  const database = databaseWith(sampleProduct, 0);
  await assert.rejects(
    createSale({ items: [{ productId: 'product-1', quantity: 1 }], discount: 0, amountPaid: 30000, paymentMethod: 'CASH' }, 'cashier-1', database),
    (error) => error.status === 409,
  );
  assert.equal(database.calls.sale, null);
});