const db = require('../config/database');

function getOrderFor(req, res) {
  const order = db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ message: 'Заказ не найден' });
  if (req.user.role === 'client' && Number(order.client_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  if (req.user.role === 'agent' && order.agent_id && Number(order.agent_id) !== Number(req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  return order;
}

function getOrderDocuments(req, res) {
  const order = getOrderFor(req, res);
  if (!order) return;
  const docs = db.all(
    `SELECT od.*, d.name, d.description, d.is_required
     FROM order_documents od JOIN documents d ON od.document_id = d.id
     WHERE od.order_id = ? ORDER BY d.is_required DESC, od.id`, [order.id]);
  res.json({ documents: docs });
}

function listDocTemplates(req, res) {
  res.json({ documents: db.all('SELECT * FROM documents ORDER BY id') });
}

function uploadDocument(req, res) {
  const order = getOrderFor(req, res);
  if (!order) return;
  const document_id = req.body.document_id;
  if (!document_id) return res.status(400).json({ message: 'Укажите document_id' });
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Файл не загружен' });

  const od = db.get('SELECT * FROM order_documents WHERE order_id = ? AND document_id = ?', [order.id, document_id]);
  if (!od) return res.status(404).json({ message: 'Документ не найден' });

  db.run('UPDATE order_documents SET file_path = ?, status = ?, uploaded_at = datetime(\'now\'), checked_at = NULL WHERE id = ?',
    [file.filename, 'на проверке', od.id]);

  db.persist();
  res.json({ message: 'Документ загружен', document: db.get('SELECT od.*, d.name FROM order_documents od JOIN documents d ON od.document_id = d.id WHERE od.id = ?', [od.id]) });
}

function changeDocumentStatus(req, res) {
  const { status, rejection_reason } = req.body;
  const od = db.get('SELECT * FROM order_documents WHERE id = ?', [req.params.id]);
  if (!od) return res.status(404).json({ message: 'Документ не найден' });

  // Only agent/admin can verify documents
  if (req.user.role === 'client') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  const orderCheck = db.get('SELECT * FROM orders WHERE id = ?', [od.order_id]);
  if (req.user.role === 'agent' && orderCheck && orderCheck.agent_id && Number(orderCheck.agent_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Доступ запрещён: заказ не назначен вам' });
  }

  const allowed = ['загружен', 'на проверке', 'подтвержден', 'отклонен'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Некорректный статус' });

  db.run('UPDATE order_documents SET status = ?, rejection_reason = ?, checked_at = datetime(\'now\') WHERE id = ?',
    [status, status === 'отклонен' ? (rejection_reason || '') : null, od.id]);

  const order = orderCheck;
  if (order && status === 'отклонен') {
    db.run('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [order.client_id, 'document', 'Документ отклонён', ('Документ был отклонён агентом. Причина: ' + (rejection_reason || 'не указана'))]);
  }
  if (order && (status === 'подтвержден' || status === 'отклонен')) {
    db.run('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [order.client_id, 'document', 'Документ проверен', ('Результат проверки документа: ' + (status === 'подтвержден' ? 'подтверждён' : 'отклонён'))]);
  }

  db.persist();
  res.json({ message: 'Статус документа обновлён', document: db.get('SELECT od.*, d.name FROM order_documents od JOIN documents d ON od.document_id = d.id WHERE od.id = ?', [od.id]) });
}

function deleteDocument(req, res) {
  const od = db.get('SELECT * FROM order_documents WHERE id = ?', [req.params.id]);
  if (!od) return res.status(404).json({ message: 'Документ не найден' });
  const order = db.get('SELECT * FROM orders WHERE id = ?', [od.order_id]);
  if (req.user.role === 'client') {
    if (!order || Number(order.client_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
  }
  db.run('UPDATE order_documents SET file_path = NULL, status = ? WHERE id = ?', ['не предоставлен', od.id]);
  db.persist();
  res.json({ message: 'Файл документа удалён' });
}

function createDocumentTemplate(req, res) {
  const { name, description, is_required } = req.body;
  if (!name) return res.status(400).json({ message: 'Укажите название документа' });
  db.run('INSERT INTO documents (name, description, is_required) VALUES (?, ?, ?)',
    [name, description || '', is_required === undefined ? 1 : (is_required ? 1 : 0)]);
  res.status(201).json({ message: 'Документ создан', document: db.get('SELECT * FROM documents WHERE id = ?', [db.lastInsertId()]) });
}

module.exports = { getOrderDocuments, listDocTemplates, uploadDocument, changeDocumentStatus, deleteDocument, createDocumentTemplate };
