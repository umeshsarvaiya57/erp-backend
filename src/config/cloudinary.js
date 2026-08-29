const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const env = require('./env');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary if credentials are provided
let useCloudinary = false;
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  useCloudinary = true;
  console.log('Cloudinary storage engine configured successfully.');
} else {
  console.log('Cloudinary credentials missing. Falling back to local disk storage for uploads.');
}

// Ensure local uploads directory exists
const localUploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'));
  }
});

/**
 * Upload helper that uploads to Cloudinary or falls back to returning the local serving URL path.
 * Deletes local temp file if Cloudinary succeeds.
 */
const uploadImage = async (file) => {
  if (useCloudinary) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'myerp_uploads',
      });
      // Delete temporary file from local storage
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to delete temp file:', err.message);
      }
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload failed. Retaining local file as fallback:', error.message);
    }
  }
  
  // Return local file serving URL path (requires express static middleware)
  return `/uploads/${path.basename(file.path)}`;
};

module.exports = {
  upload,
  uploadImage
};
