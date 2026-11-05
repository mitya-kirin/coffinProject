const express = require('express');
const router = express.Router();
const controller = require('../controllers/services.controller');
const { authRequired, requireAdmin } = require('../middleware/auth.middleware');

// Categories
router.get('/categories', controller.listCategories);
router.post('/categories', authRequired, requireAdmin, controller.createCategory);
router.put('/categories/:id', authRequired, requireAdmin, controller.updateCategory);
router.delete('/categories/:id', authRequired, requireAdmin, controller.deleteCategory);

// Services
router.get('/services', controller.listServices);
router.get('/services/:id', controller.getService);
router.post('/services', authRequired, requireAdmin, controller.createService);
router.put('/services/:id', authRequired, requireAdmin, controller.updateService);
router.delete('/services/:id', authRequired, requireAdmin, controller.deleteService);

module.exports = router;
