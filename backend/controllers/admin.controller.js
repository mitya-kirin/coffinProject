const db = require('../config/database');

function str(v) {
  return v !== undefined && v !== null ? String(v) : '';
}

function stats(req, res) {
  const count = (sql, param) => (db.get(sql, param ? [param] : [])).c;
  const data = {
    new_orders: count(`SELECT COUNT(*) AS c FROM orders WHERE status = 'Новая заявка'`),
    pending_orders: count(`SELECT COUNT(*) AS c FROM orders WHERE status IN ('Новая заявка','На рассмотрении','Назначен агент','Ожидаются документы','Подготовка заказа','Подтверждено','Выполняется')`),
    active_orders: count(`SELECT COUNT(*) AS c FROM orders WHERE status NOT IN ('Завершено','Отменено')`),
    completed_orders: count(`SELECT COUNT(*) AS c FROM orders WHERE status = 'Завершено'`),
    total_orders: count(`SELECT COUNT(*) AS c FROM orders`),
    clients: count(`SELECT COUNT(*) AS c FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'client')`),
    agents: count(`SELECT COUNT(*) AS c FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'agent')`),
    services: count(`SELECT COUNT(*) AS c FROM services`),
    free_places: count(`SELECT COUNT(*) AS c FROM burial_places WHERE status = 'свободно'`),
    occupied_places: count(`SELECT COUNT(*) AS c FROM burial_places WHERE status = 'занято'`),
    reserved_places: count(`SELECT COUNT(*) AS c FROM burial_places WHERE status = 'зарезервировано'`),
    cemeteries: count(`SELECT COUNT(*) AS c FROM cemeteries`),
    burials: count(`SELECT COUNT(*) AS c FROM burials`),
    unread_messages: count(`SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND is_read = 0`, req.user.id),
    unread_notifications: count(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`, req.user.id)
  };
  res.json({ stats: data });
}

function createAgent(req, res) {
  const { full_name, email, phone, password, address, work_hours } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ message: 'Укажите ФИО, email и пароль' });
  const bcrypt = require('bcryptjs');
  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
  const agentRole = db.get('SELECT id FROM roles WHERE name = ?', ['agent']);
  db.run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address, work_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [agentRole.id, full_name, email, phone || '', bcrypt.hashSync(password, 10), str(address), str(work_hours)]);
  const id = db.lastInsertId();
  db.persist();
  const user = db.get(`SELECT u.id, r.name AS role, u.full_name, u.email, u.phone, u.work_hours FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`, [id]);
  res.status(201).json({ message: 'Агент создан', user });
}

module.exports = { stats, createAgent };
