const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.controller');
const { authRequired, requireAdmin } = require('../middleware/auth.middleware');

router.get('/stats', authRequired, requireAdmin, controller.stats);
router.post('/agents', authRequired, requireAdmin, controller.createAgent);

module.exports = router;
