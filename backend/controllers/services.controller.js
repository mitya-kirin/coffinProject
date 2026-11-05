const db = require('../config/database');

function str(v) {
  return v !== undefined && v !== null ? String(v) : '';
}

// --- Categories ---
function listCategories(req, res) {
  res.json({ categories: db.all('SELECT * FROM categories ORDER BY id') });
}

function createCategory(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Укажите название категории' });
  db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, str(description)]);
  const id = db.lastInsertId();
  res.status(201).json({ message: 'Категория создана', category: db.get('SELECT * FROM categories WHERE id = ?', [id]) });
}

function updateCategory(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Категория не найдена' });
  const { name, description } = req.body;
  db.run('UPDATE categories SET name = ?, description = ? WHERE id = ?', [
    name !== undefined ? name : existing.name,
    description !== undefined ? description : existing.description,
    id
  ]);
  res.json({ message: 'Категория обновлена', category: db.get('SELECT * FROM categories WHERE id = ?', [id]) });
}

function deleteCategory(req, res) {
  const id = req.params.id;
  const services = db.get('SELECT COUNT(*) AS c FROM services WHERE category_id = ?', [id]);
  if (services.c > 0) {
    return res.status(400).json({ message: 'Нельзя удалить категорию, в которой есть услуги' });
  }
  db.run('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ message: 'Категория удалена' });
}

// --- Services ---
function listServices(req, res) {
  let sql = `
    SELECT s.*, c.name AS category_name
    FROM services s LEFT JOIN categories c ON s.category_id = c.id`;
  const params = [];
  const where = [];
  if (req.query.category_id) {
    where.push('s.category_id = ?');
    params.push(req.query.category_id);
  }
  if (req.query.active === 'true') {
    where.push('s.is_active = 1');
  }
  if (req.query.search) {
    where.push('s.name LIKE ?');
    params.push('%' + req.query.search + '%');
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  if (req.query.sort === 'price_asc') sql += ' ORDER BY s.price ASC';
  else if (req.query.sort === 'price_desc') sql += ' ORDER BY s.price DESC';
  else sql += ' ORDER BY s.id';
  res.json({ services: db.all(sql, params) });
}

function getService(req, res) {
  const service = db.get(
    'SELECT s.*, c.name AS category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?',
    [req.params.id]
  );
  if (!service) return res.status(404).json({ message: 'Услуга не найдена' });
  res.json({ service });
}

function createService(req, res) {
  const { category_id, name, description, price, unit, image, is_active } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ message: 'Укажите название и стоимость услуги' });
  }
  db.run(
    'INSERT INTO services (category_id, name, description, price, unit, image, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      category_id || null,
      name,
      str(description),
      Number(price) || 0,
      str(unit),
      str(image),
      is_active === undefined ? 1 : (is_active ? 1 : 0)
    ]
  );
  const id = db.lastInsertId();
  res.status(201).json({ message: 'Услуга создана', service: db.get('SELECT * FROM services WHERE id = ?', [id]) });
}

function updateService(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM services WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Услуга не найдена' });
  const { category_id, name, description, price, unit, image, is_active } = req.body;
  db.run(
    `UPDATE services SET category_id = ?, name = ?, description = ?, price = ?, unit = ?, image = ?, is_active = ? WHERE id = ?`,
    [
      category_id !== undefined ? category_id : existing.category_id,
      name !== undefined ? name : existing.name,
      description !== undefined ? description : existing.description,
      price !== undefined ? Number(price) : existing.price,
      unit !== undefined ? unit : existing.unit,
      image !== undefined ? image : existing.image,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id
    ]
  );
  res.json({ message: 'Услуга обновлена', service: db.get('SELECT * FROM services WHERE id = ?', [id]) });
}

function deleteService(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM services WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Услуга не найдена' });
  db.run('DELETE FROM services WHERE id = ?', [id]);
  res.json({ message: 'Услуга удалена' });
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listServices, getService, createService, updateService, deleteService
};
