const express = require('express');
const router = express.Router();
const controller = require('../controllers/users.controller');
const { authRequired, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authRequired, requireAdmin, controller.listUsers);
router.get('/:id', authRequired, controller.getUser);
router.put('/:id', authRequired, controller.updateUser);
router.delete('/:id', authRequired, requireAdmin, controller.deleteUser);
router.post('/:id/change-password', authRequired, controller.changePassword);
router.put('/:id/block', authRequired, requireAdmin, controller.blockUser);
router.put('/:id/unblock', authRequired, requireAdmin, controller.unblockUser);

module.exports = router;