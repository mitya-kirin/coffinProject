const express = require('express');
const router = express.Router();
const controller = require('../controllers/notifications.controller');
const { authRequired } = require('../middleware/auth.middleware');

router.get('/', authRequired, controller.listNotifications);
router.patch('/:id/read', authRequired, controller.markRead);
router.patch('/read-all', authRequired, controller.markAllRead);
router.get('/unread-count', authRequired, controller.unreadCount);
router.get('/reminders', authRequired, controller.listReminders);
router.post('/reminders', authRequired, controller.createReminder);
router.put('/reminders/:id', authRequired, controller.updateReminder);
router.delete('/reminders/:id', authRequired, controller.deleteReminder);

module.exports = router;
