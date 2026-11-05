const express = require('express');
const router = express.Router();
const controller = require('../controllers/orders.controller');
const { authRequired } = require('../middleware/auth.middleware');

router.get('/', authRequired, controller.listOrders);
router.get('/:id', authRequired, controller.getOrder);
router.post('/', authRequired, controller.createOrder);
router.put('/:id', authRequired, controller.updateOrder);
router.patch('/:id/status', authRequired, controller.changeStatus);

module.exports = router;
