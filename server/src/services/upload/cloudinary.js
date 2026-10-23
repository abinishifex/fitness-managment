const { env } = require('../../config/env');
const { createError } = require('../../middleware/errorHandler');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw createError(503, 'Screenshot upload is not configured (Cloudinary)');
  }
}

/**
 * Upload an image buffer to Cloudinary.
 * @param {{ buffer: Buffer, mimetype: string, originalname?: string }} file
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadScreenshot(file) {
  assertCloudinaryConfigured();

  if (!file || !file.buffer) {
    throw createError(400, 'No file uploaded');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw createError(400, 'Only JPEG, PNG, WebP, or GIF images are allowed');
  }
  if (file.buffer.length > MAX_BYTES) {
    throw createError(400, 'Image must be 5MB or smaller');
  }

  // Lazy-require so tests without the package / credentials still load the app.
  const { v2: cloudinary } = require('cloudinary');
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'fitness-mgt/payment-screenshots',
        resource_type: 'image',
        type: 'authenticated',
        access_mode: 'authenticated',
      },
      (err, res) => {
        if (err) reject(err);
        else resolve(res);
      }
    );
    stream.end(file.buffer);
  });

  const url = signedScreenshotUrl(result.public_id) || result.secure_url;
  return { url, publicId: result.public_id };
}

/**
 * Mint a fresh signed URL for an authenticated Cloudinary screenshot.
 * @param {string|null|undefined} publicId
 * @returns {string|null}
 */
function signedScreenshotUrl(publicId) {
  if (!publicId || !env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return null;
  }
  try {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: 'authenticated',
      resource_type: 'image',
      // Long enough for an admin review session
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
  } catch {
    return null;
  }
}

/**
 * Dev/test fallback: accept a data URL or return a placeholder when Cloudinary is unset
 * and NODE_ENV is not production.
 */
async function uploadScreenshotOrStub(file) {
  if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
    return uploadScreenshot(file);
  }
  if (env.nodeEnv === 'production') {
    throw createError(503, 'Screenshot upload is not configured (Cloudinary)');
  }
  if (!file || !file.buffer) {
    throw createError(400, 'No file uploaded');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw createError(400, 'Only JPEG, PNG, WebP, or GIF images are allowed');
  }
  if (file.buffer.length > MAX_BYTES) {
    throw createError(400, 'Image must be 5MB or smaller');
  }
  const b64 = file.buffer.toString('base64');
  const url = `data:${file.mimetype};base64,${b64.slice(0, 64)}…stub`;
  return { url: `stub://screenshot/${Date.now()}`, publicId: null, stub: true, preview: url };
}

module.exports = {
  uploadScreenshot,
  uploadScreenshotOrStub,
  signedScreenshotUrl,
  ALLOWED_MIME,
  MAX_BYTES,
};
