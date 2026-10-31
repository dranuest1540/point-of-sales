import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../shared/errors.js';
import { deleteProductImage, uploadProductImage } from '../../shared/cloudinary.js';
import { archiveProduct, createProduct, getProduct, listProducts, updateProduct } from './products.service.js';

const router = Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new AppError(400, 'Format gambar harus JPG, PNG, atau WebP.'));
      return;
    }
    callback(null, true);
  },
});
const productInput = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.coerce.number().positive().max(9999999999),
  stock: z.coerce.number().int().min(0),
  lowStockAt: z.coerce.number().int().min(0).default(5),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

function getProductInput(request) {
  if (!request.is('multipart/form-data')) return request.body;
  if (typeof request.body.product !== 'string') {
    throw new AppError(400, 'Data produk pada form tidak ditemukan.');
  }
  try {
    return JSON.parse(request.body.product);
  } catch {
    throw new AppError(400, 'Data produk pada form bukan JSON yang valid.');
  }
}

async function removeImageAfterFailure(publicId, originalError) {
  try {
    await deleteProductImage(publicId);
  } catch (cleanupError) {
    console.error('Cloudinary cleanup failed after a product update error:', cleanupError);
  }
  throw originalError;
}

router.use(authenticate);

router.get('/', asyncHandler(async (request, response) => {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 12));
  response.json(await listProducts({
    page,
    limit,
    search: request.query.search ? String(request.query.search) : undefined,
    categoryId: request.query.categoryId ? String(request.query.categoryId) : undefined,
    lowStock: request.query.lowStock === 'true',
    status: request.query.status ? String(request.query.status) : undefined,
    role: request.user.role,
  }));
}));

router.get('/:id', asyncHandler(async (request, response) => {
  const item = await getProduct(request.params.id, request.user.role);
  if (!item) {
    return response.status(404).json({ error: { message: 'Produk tidak ditemukan.' } });
  }
  response.json({ data: item });
}));

router.post('/', authorize('ADMIN'), imageUpload.single('image'), asyncHandler(async (request, response) => {
  const input = productInput.parse(getProductInput(request));
  const image = request.file ? await uploadProductImage(request.file) : undefined;
  let item;
  try {
    item = await createProduct({ ...input, ...(image ?? {}) });
  } catch (error) {
    if (image) return removeImageAfterFailure(image.imagePublicId, error);
    throw error;
  }
  response.status(201).json({ data: item });
}));

router.patch('/:id', authorize('ADMIN'), imageUpload.single('image'), asyncHandler(async (request, response) => {
  const input = productInput.partial().parse(getProductInput(request));
  const previous = request.file ? await getProduct(request.params.id, 'ADMIN') : undefined;
  if (request.file && !previous) throw new AppError(404, 'Produk tidak ditemukan.');

  const image = request.file ? await uploadProductImage(request.file) : undefined;
  let item;
  try {
    item = await updateProduct(request.params.id, { ...input, ...(image ?? {}) });
  } catch (error) {
    if (image) return removeImageAfterFailure(image.imagePublicId, error);
    throw error;
  }
  if (image && previous?.imagePublicId) {
    try {
      await deleteProductImage(previous.imagePublicId);
    } catch (error) {
      console.error(`Unable to remove previous Cloudinary image for product ${item.id}:`, error);
    }
  }
  response.json({ data: item });
}));

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (request, response) => {
  const item = await archiveProduct(request.params.id);
  response.json({ data: item, message: 'Produk dinonaktifkan.' });
}));

export default router;