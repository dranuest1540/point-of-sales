import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './errors.js';

function getCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Konfigurasi Cloudinary belum lengkap.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function uploadProductImage(file) {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({
      folder: 'kasa-pos/products',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    }, (error, result) => {
      if (error) {
        reject(new AppError(502, 'Gambar gagal diunggah ke Cloudinary.'));
        return;
      }
      if (!result?.secure_url || !result.public_id) {
        reject(new AppError(502, 'Cloudinary tidak mengembalikan informasi gambar.'));
        return;
      }
      resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
    });
    stream.end(file.buffer);
  });
}

export async function deleteProductImage(publicId) {
  const result = await getCloudinary().uploader.destroy(publicId, { resource_type: 'image' });
  if (!['ok', 'not found'].includes(result.result)) {
    throw new AppError(502, 'Gambar lama tidak dapat dihapus dari Cloudinary.');
  }
}
