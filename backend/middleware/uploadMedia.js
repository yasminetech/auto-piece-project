const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'products');
const MAX_FILE_SIZE = 25 * 1024 * 1024;

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

function sanitizeName(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'media';
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_ROOT);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || '';
    const safeBase = sanitizeName(file.originalname);
    callback(null, `${Date.now()}-${safeBase}${extension}`);
  },
});

const uploadProductMedia = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 8,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Seuls les fichiers image et video sont autorises.'));
  },
});

module.exports = {
  uploadProductMedia,
  UPLOAD_ROOT,
};
