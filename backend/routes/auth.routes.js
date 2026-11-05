const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', authRequired, controller.me);

module.exports = router;
