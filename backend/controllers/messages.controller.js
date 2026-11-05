const db = require('../config/database');

function listMessages(req, res) {
  const order_id = req.query.order_id;
  if (!order_id) return res.status(400).json({ message: 'Укажите order_id' });
  const order = db.get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ message: 'Заказ не найден' });
  if (['client', 'agent'].includes(req.user.role)) {
    const ok = Number(order.client_id) === Number(req.user.id) ||
      (order.agent_id && Number(order.agent_id) === Number(req.user.id)) ||
      req.user.role === 'admin';
    if (!ok) return res.status(403).json({ message: 'Доступ запрещён' });
  }
  const messages = db.all(
    `SELECT m.*, u.full_name AS sender_name, r.name AS sender_role
     FROM messages m JOIN users u ON m.sender_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE m.order_id = ? ORDER BY m.created_at ASC, m.id ASC`, [order_id]);
  res.json({ messages });
}

function sendMessage(req, res) {
  const { order_id, receiver_id, message } = req.body;
  if (!order_id || !message) return res.status(400).json({ message: 'Укажите order_id и текст сообщения' });
  const order = db.get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ message: 'Заказ не найден' });

  let receiverId = receiver_id;
  if (!receiverId) {
    if (req.user.role === 'client') {
      receiverId = order.agent_id;
    } else {
      receiverId = order.client_id;
    }
  }

  db.run('INSERT INTO messages (sender_id, receiver_id, order_id, message) VALUES (?, ?, ?, ?)',
    [req.user.id, receiverId, order_id, message]);
  const id = db.lastInsertId();

  if (receiverId) {
    db.run('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [receiverId, 'message', 'Новое сообщение', `Вам пришло сообщение по заказу ${order.order_number}`]);
  }

  db.persist();
  const sent = db.get(
    `SELECT m.*, u.full_name AS sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`, [id]);
  res.status(201).json({ message: 'Сообщение отправлено', msg: sent });
}

function markRead(req, res) {
  const id = req.params.id;
  const msg = db.get('SELECT * FROM messages WHERE id = ?', [id]);
  if (!msg) return res.status(404).json({ message: 'Сообщение не найдено' });
  db.run('UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?', [id, req.user.id]);
  db.persist();
  res.json({ message: 'Сообщение отмечено прочитанным' });
}

function markAllRead(req, res) {
  const order_id = req.query.order_id;
  if (!order_id) return res.json({ message: 'ok' });
  db.run('UPDATE messages SET is_read = 1 WHERE order_id = ? AND receiver_id = ?', [order_id, req.user.id]);
  db.persist();
  res.json({ message: 'Все сообщения отмечены прочитанными' });
}

module.exports = { listMessages, sendMessage, markRead, markAllRead };
