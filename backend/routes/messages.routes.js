const express = require('express');
const router = express.Router();
const controller = require('../controllers/messages.controller');
const { authRequired } = require('../middleware/auth.middleware');

router.get('/', authRequired, controller.listMessages);
router.post('/', authRequired, controller.sendMessage);
router.patch('/:id/read', authRequired, controller.markRead);
router.patch('/read-all', authRequired, controller.markAllRead);

module.exports = router;
