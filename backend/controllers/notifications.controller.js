const db = require('../config/database');

function listNotifications(req, res) {
  const sql = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC';
  const rows = db.all(sql, [req.user.id]);
  res.json({ notifications: rows });
}

function markRead(req, res) {
  const id = req.params.id;
  const n = db.get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!n) return res.status(404).json({ message: 'Уведомление не найдено' });
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  db.persist();
  res.json({ message: 'Уведомление отмечено прочитанным' });
}

function markAllRead(req, res) {
  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  db.persist();
  res.json({ message: 'Все уведомления отмечены прочитанными' });
}

function unreadCount(req, res) {
  const c = db.get('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ count: c.c });
}

// --- reminders ---
function listReminders(req, res) {
  let sql = 'SELECT r.*, o.order_number FROM reminders r LEFT JOIN orders o ON r.order_id = o.id';
  const where = [];
  const params = [];
  if (req.user.role === 'client') {
    where.push('r.user_id = ?');
    params.push(req.user.id);
  } else if (req.user.role === 'agent') {
    where.push('(r.user_id = ? OR (o.agent_id = ?))');
    params.push(req.user.id, req.user.id);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.reminder_date ASC';
  res.json({ reminders: db.all(sql, params) });
}

function createReminder(req, res) {
  const { order_id, user_id, title, description, reminder_date, status } = req.body;
  if (!title || !reminder_date) return res.status(400).json({ message: 'Укажите название и дату напоминания' });
  const targetUser = user_id || req.user.id;
  db.run('INSERT INTO reminders (order_id, user_id, title, description, reminder_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [order_id || null, targetUser, title, description || '', reminder_date, status || 'активно']);
  const id = db.lastInsertId();

  if (targetUser !== req.user.id) {
    db.run('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [targetUser, 'reminder', 'Напоминание', title]);
  }
  db.persist();
  res.status(201).json({ message: 'Напоминание создано', reminder: db.get('SELECT * FROM reminders WHERE id = ?', [id]) });
}

function updateReminder(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM reminders WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Напоминание не найдено' });
  const { title, description, reminder_date, status } = req.body;
  db.run('UPDATE reminders SET title = ?, description = ?, reminder_date = ?, status = ? WHERE id = ?', [
    title !== undefined ? title : existing.title,
    description !== undefined ? description : existing.description,
    reminder_date !== undefined ? reminder_date : existing.reminder_date,
    status !== undefined ? status : existing.status,
    id
  ]);
  db.persist();
  res.json({ message: 'Напоминание обновлено', reminder: db.get('SELECT * FROM reminders WHERE id = ?', [id]) });
}

function deleteReminder(req, res) {
  db.run('DELETE FROM reminders WHERE id = ?', [req.params.id]);
  db.persist();
  res.json({ message: 'Напоминание удалено' });
}

module.exports = { listNotifications, markRead, markAllRead, unreadCount, listReminders, createReminder, updateReminder, deleteReminder };
