const db = require('../config/database');

function isClientAccessible(order, user) {
  // client only own orders
  return user.role !== 'client' || Number(order.client_id) === Number(user.id);
}

function isAgentAccessible(order, user) {
  // Обработчик (agent) и админ видят все заказы; клиент — только свои
  if (user.role === 'admin' || user.role === 'agent') return true;
  return Number(order.client_id) === Number(user.id);
}

function serializeOrder(row, user) {
  const order = db.get(
    `SELECT o.*, c.full_name AS client_name, c.phone AS client_phone, c.email AS client_email,
            a.full_name AS agent_name, a.phone AS agent_phone, a.email AS agent_email, a.photo AS agent_photo, a.work_hours AS agent_work_hours,
            cem.name AS cemetery_name,
            bp.row_number AS place_row, bp.place_number AS place_number, bp.status AS place_status, sec.name AS section_name
     FROM orders o
     LEFT JOIN users c ON o.client_id = c.id
     LEFT JOIN users a ON o.agent_id = a.id
     LEFT JOIN cemeteries cem ON o.cemetery_id = cem.id
     LEFT JOIN burial_places bp ON o.burial_place_id = bp.id
     LEFT JOIN cemetery_sections sec ON bp.section_id = sec.id
     WHERE o.id = ?`,
    [row.id]
  );
  if (order && !isAgentAccessible(order, user)) return null;
  if (order) {
    order.items = db.all(
      `SELECT oi.*, s.name AS service_name, s.unit, s.category_id, c.name AS category_name
       FROM order_items oi JOIN services s ON oi.service_id = s.id
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE oi.order_id = ?`, [order.id]);
    order.status_history = db.all(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC', [order.id]);
  }
  return order;
}

function generateOrderNumber() {
  const year = new Date().getFullYear();
  const row = db.get('SELECT COUNT(*) AS c FROM orders WHERE order_number LIKE ?', ['ORD-' + year + '-%']);
  const next = (row.c + 1);
  return 'ORD-' + year + '-' + String(next).padStart(6, '0');
}

function notify(userId, { type, title, message }) {
  if (!userId) return;
  db.run('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
    [userId, type, title, message]);
}

function listOrders(req, res) {
  let sql = `
    SELECT o.*, c.full_name AS client_name, a.full_name AS agent_name
    FROM orders o
    LEFT JOIN users c ON o.client_id = c.id
    LEFT JOIN users a ON o.agent_id = a.id
  `;
  const params = [];
  const where = [];
  if (req.user.role === 'client') {
    where.push('o.client_id = ?');
    params.push(req.user.id);
  }
  // Обработчик (agent) и админ видят все заказы
  if (req.query.status) {
    where.push('o.status = ?');
    params.push(req.query.status);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY o.created_at DESC';
  const orders = db.all(sql, params).map((o) => {
    const full = db.get('SELECT o.*, cem.name AS cemetery_name FROM orders o LEFT JOIN cemeteries cem ON o.cemetery_id = cem.id WHERE o.id = ?', [o.id]);
    full.items_count = db.get('SELECT COUNT(*) AS c FROM order_items WHERE order_id = ?', [o.id]).c;
    return full;
  });
  res.json({ orders });
}

function getOrder(req, res) {
  const order = serializeOrder({ id: req.params.id }, req.user);
  if (!order) return res.status(404).json({ message: 'Заказ не найден или доступ запрещён' });
  res.json({ order });
}

function createOrder(req, res) {
  const { items, comment, desired_date, desired_time, address, need_burial, cemetery_id, additional_info, delivery_address, delivery_date, delivery_status } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Добавьте хотя бы одну услугу' });
  }
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Только клиент может создавать заказ' });
  }

  // Validate items, compute total
  let total = 0;
  const validatedItems = [];
  for (const item of items) {
    const service = db.get('SELECT * FROM services WHERE id = ? AND is_active = 1', [item.service_id]);
    if (!service) return res.status(400).json({ message: 'Услуга не найдена' });
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(service.price) || 0;
    total += price * quantity;
    validatedItems.push({ service, quantity, price });
  }

  const orderNumber = generateOrderNumber();
  const clientId = req.user.id;

  db.run(
    `INSERT INTO orders (order_number, client_id, cemetery_id, status, total_price, comment, desired_date, desired_time, address, need_burial, additional_info, delivery_address, delivery_date, delivery_status)
     VALUES (?, ?, ?, 'Новая заявка', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderNumber, clientId, cemetery_id || null, total, comment || '', desired_date || '', desired_time || '', address || '', need_burial ? 1 : 0, additional_info || '',
     delivery_address || '', delivery_date || '', (delivery_address ? (delivery_status || 'оформлена') : 'не требуется')]
  );
  const orderId = db.lastInsertId();

  for (const item of validatedItems) {
    db.run('INSERT INTO order_items (order_id, service_id, quantity, price, total_price) VALUES (?, ?, ?, ?, ?)',
      [orderId, item.service.id, item.quantity, item.price, item.price * item.quantity]);
  }

  // status history
  db.run('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by) VALUES (?, NULL, ?, ?)',
    [orderId, 'Новая заявка', clientId]);

  // attach required documents
  const docs = db.all('SELECT * FROM documents');
  for (const d of docs) {
    db.run('INSERT INTO order_documents (order_id, document_id) VALUES (?, ?)', [orderId, d.id]);
  }

  notify(clientId, { type: 'order_created', title: 'Заявка создана', message: `Ваша заявка ${orderNumber} создана. Мы свяжемся с вами в ближайшее время.` });

  const admins = db.all('SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = ?)', ['admin']);
  for (const adm of admins) {
    notify(adm.id, { type: 'order_new', title: 'Новая заявка', message: `Клиент ${req.user.full_name} оформил заявку ${orderNumber}` });
  }

  db.persist();
  const order = serializeOrder({ id: orderId }, req.user);
  res.status(201).json({ message: 'Заявка создана', order });
}

function updateOrder(req, res) {
  const order = serializeOrder({ id: req.params.id }, req.user);
  if (!order) return res.status(404).json({ message: 'Заказ не найден или доступ запрещён' });
  const existing = db.get('SELECT * FROM orders WHERE id = ?', [order.id]);

  const { agent_id, cemetery_id, burial_place_id, comment, desired_date, desired_time, address, need_burial, additional_info, total_price,
          delivery_address, delivery_date, delivery_status } = req.body;

  const fields = {};
  if (req.user.role === 'admin' && agent_id !== undefined) fields.agent_id = agent_id;
  if (req.user.role !== 'client') {
    if (cemetery_id !== undefined) fields.cemetery_id = cemetery_id;
    if (burial_place_id !== undefined) fields.burial_place_id = burial_place_id;
  }
  if (comment !== undefined) fields.comment = comment;
  if (desired_date !== undefined) fields.desired_date = desired_date;
  if (desired_time !== undefined) fields.desired_time = desired_time;
  if (address !== undefined) fields.address = address;
  if (need_burial !== undefined) fields.need_burial = need_burial ? 1 : 0;
  if (additional_info !== undefined) fields.additional_info = additional_info;
  if (req.user.role === 'admin' && total_price !== undefined) fields.total_price = total_price;
  // Доставка — может задавать обработчик/клиент
  if (req.user.role !== 'client' || delivery_address !== undefined) fields.delivery_address = delivery_address !== undefined ? delivery_address : existing.delivery_address;
  if (req.user.role !== 'client' || delivery_date !== undefined) fields.delivery_date = delivery_date !== undefined ? delivery_date : existing.delivery_date;
  if (delivery_status !== undefined) fields.delivery_status = delivery_status;
  // Если указан адрес доставки и статус ещё не задан — считаем доставку оформленной
  if (fields.delivery_address && !fields.delivery_status && (!existing.delivery_status || existing.delivery_status === 'не требуется')) {
    fields.delivery_status = 'оформлена';
  }
  if (fields.delivery_address === '' && !fields.delivery_status) {
    fields.delivery_status = 'не требуется';
  }

  const sets = Object.keys(fields).map(k => `${k} = ?`);
  if (sets.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
  sets.push('updated_at = datetime(\'now\')');
  const params = Object.keys(fields).map(k => fields[k]).concat(req.params.id);
  db.run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);

  db.persist();
  res.json({ message: 'Заказ обновлён', order: serializeOrder({ id: order.id }, req.user) });
}

const STATUS_FLOW = [
  'Новый',
  'Ожидает подтверждения',
  'Подтверждён',
  'Ожидает оплаты',
  'Оплачен',
  'В обработке',
  'Собирается',
  'Передан в доставку',
  'Доставляется',
  'Выполнен',
  'Отменён'
];

// Обратная совместимость: сопоставление старых статусов с новыми
const STATUS_LEGACY_MAP = {
  'Новая заявка': 'Новый',
  'На рассмотрении': 'Ожидает подтверждения',
  'Назначен агент': 'Подтверждён',
  'Ожидаются документы': 'Ожидает оплаты',
  'Подготовка заказа': 'В обработке',
  'Подтверждено': 'Оплачен',
  'Выполняется': 'Собирается',
  'Завершено': 'Выполнен',
  'Отменено': 'Отменён'
};

function changeStatus(req, res) {
  const order = serializeOrder({ id: req.params.id }, req.user);
  if (!order) return res.status(404).json({ message: 'Заказ не найден или доступ запрещён' });

  if (req.user.role === 'client') {
    return res.status(403).json({ message: 'Клиент не может изменять статус заказа' });
  }

  const { status, comment } = req.body;
  if (!status) return res.status(400).json({ message: 'Укажите новый статус' });
  const normalizedStatus = STATUS_LEGACY_MAP[status] || status;
  if (!STATUS_FLOW.includes(normalizedStatus)) return res.status(400).json({ message: 'Некорректный статус' });

  const oldStatus = order.status;
  db.run('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [normalizedStatus, order.id]);
  db.run('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, comment) VALUES (?, ?, ?, ?, ?)',
    [order.id, oldStatus, normalizedStatus, req.user.id, comment || '']);

  // При подтверждении брони — помечаем выбранное место как зарезервированное
  if (normalizedStatus === 'Подтверждён' && order.burial_place_id) {
    db.run("UPDATE burial_places SET status = 'зарезервировано' WHERE id = ?", [order.burial_place_id]);
  }

  // Уведомление клиенту
  if (normalizedStatus === 'Подтверждён' && order.agent_id) {
    const agent = db.get('SELECT full_name FROM users WHERE id = ?', [order.agent_id]);
    notify(order.client_id, { type: 'status', title: 'Назначен агент', message: `Вашему заказу ${order.order_number} назначен агент ${agent ? agent.full_name : ''}` });
  } else {
    notify(order.client_id, { type: 'status', title: 'Статус заказа изменён', message: `Статус заказа ${order.order_number}: "${normalizedStatus}"` });
  }

  db.persist();
  res.json({ message: 'Статус обновлён', order: serializeOrder({ id: order.id }, req.user) });
}

module.exports = { listOrders, getOrder, createOrder, updateOrder, changeStatus, notify };
