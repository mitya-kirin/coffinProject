const express = require('express');
const router = express.Router();
const controller = require('../controllers/documents.controller');
const { authRequired, requireAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const fs = require('fs');

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const ALLOWED = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'];
const fileFilter = (req, file, cb) => {
  if (ALLOWED.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/templates', authRequired, requireAdmin, controller.listDocTemplates);
router.post('/templates', authRequired, requireAdmin, controller.createDocumentTemplate);

router.get('/orders/:id/documents', authRequired, controller.getOrderDocuments);
router.post('/orders/:id/documents', authRequired, upload.single('file'), controller.uploadDocument);
router.patch('/documents/:id/status', authRequired, controller.changeDocumentStatus);
router.delete('/documents/:id', authRequired, controller.deleteDocument);

module.exports = router;
