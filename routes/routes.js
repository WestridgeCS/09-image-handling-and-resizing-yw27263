import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import Photo from '../models/Photo.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/originals'),
    filename: (req, file, cb) => {
      const stamp = Date.now();
      const safe = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .slice(0, 60);
      cb(null, `${stamp}-${safe}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB upload allowed
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG, or WEBP allowed'), ok);
  }
});

function safeBaseName(name) {
  // super simple “safe-ish” name: letters/numbers/dash only
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // drop extension
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';
}

// Gallery page (shell). HTMX will load _show into #detailPane
router.get('/', async (req, res, next) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });

    res.render('index', {
      photos
    });
  } catch (err) {
    next(err);
  }
});

// Upload image + title/description
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.redirect('/photos');

    const title = req.body.title?.trim() || '';
    const description = req.body.description?.trim() || '';

    const stamp = Date.now();
    const thumbFile = `${stamp}-thumb.jpg`;
    const largeFile = `${stamp}-large.jpg`;
    const originalFile = req.file.filename;

    const largePath = `uploads/large/${largeFile}`;
    const thumbPath = `uploads/thumbs/${thumbFile}`;

    const img = sharp(req.file.path);
    const meta = await img.metadata();

    await img
      .clone()
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside' })
      .jpeg({ quality: 82 })
      .toFile(`uploads/large/${largeFile}`);

    await img
      .clone()
      .rotate()
      .resize({ width: 260, height: 260, fit: 'cover' })
      .jpeg({ quality: 72 })
      .toFile(`uploads/thumbs/${thumbFile}`);

    // OPTIONAL: delete the original after processing
    try {
      await fs.unlink(req.file.path);
    } catch (err) {
      console.warn('Could not delete original file:', err.code);
    }

    const originalBytes = req.file.size;

    const [largeStat, thumbStat] = await Promise.all([
      fs.stat(largePath),
      fs.stat(thumbPath)
    ]);

    await Photo.create({
      title,
      description,
      originalName: req.file.originalname,
      originalFile,  
      thumbFile,
      largeFile,
      width: meta.width,
      height: meta.height,
      originalBytes, 
      largeBytes: largeStat.size,
      thumbBytes: thumbStat.size
    });

    res.redirect('/photos');
  } catch (err) {
    next(err);
  }
});


// Show partial (loaded via HTMX when you click a thumbnail)
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).send('Not found');

    // return partial for HTMX (also fine for direct load in class)
    res.render('_show', { photo });
  } catch (err) {
    next(err);
  }
});

export default router;
