const express = require('express');
const router = express.Router();
const controller = require('../controllers/orders.controller');
const { authRequired } = require('../middleware/auth.middleware');

router.get('/', authRequired, controller.getAll);

module.exports = router;