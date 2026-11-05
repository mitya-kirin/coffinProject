const bcrypt = require('bcryptjs');
const db = require('../config/database');

function listUsers(req, res) {
  const role = req.query.role;
  let sql = `SELECT u.id, u.role_id, r.name AS role, u.full_name, u.email, u.phone, u.address, u.photo, u.work_hours, u.created_at, u.is_blocked
             FROM users u JOIN roles r ON u.role_id = r.id`;
  const params = [];
  if (role) {
    sql += ' WHERE r.name = ?';
    params.push(role);
  }
  sql += ' ORDER BY u.id DESC';
  res.json({ users: db.all(sql, params) });
}

function blockUser(req, res) {
  const id = req.params.id;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Только администратор может блокировать пользователей' });
  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Пользователь не найден' });
  if (existing.role_id === (db.get('SELECT id FROM roles WHERE name = ?', ['admin']).id)) {
    return res.status(403).json({ message: 'Нельзя заблокировать администратора' });
  }
  db.run("UPDATE users SET is_blocked = 1, updated_at = datetime('now') WHERE id = ?", [id]);
  db.persist();
  res.json({ message: 'Пользователь заблокирован' });
}

function unblockUser(req, res) {
  const id = req.params.id;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Только администратор может разблокировать пользователей' });
  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Пользователь не найден' });
  db.run("UPDATE users SET is_blocked = 0, updated_at = datetime('now') WHERE id = ?", [id]);
  db.persist();
  res.json({ message: 'Пользователь разблокирован' });
}

function getUser(req, res) {
  const id = req.params.id;
  // Clients only access themselves; agents access assigned clients; admins all
  if (req.user.role === 'client' && Number(id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  const user = db.get(
    `SELECT u.id, u.role_id, r.name AS role, u.full_name, u.email, u.phone, u.address, u.photo, u.work_hours, u.created_at
     FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [id]
  );
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }
  res.json({ user });
}

function updateUser(req, res) {
  const id = req.params.id;
  if (req.user.role === 'client' && Number(id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }

  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  const { full_name, phone, address, photo, work_hours, role_id, role } = req.body;
  const newName = full_name !== undefined ? full_name : existing.full_name;
  const newPhone = phone !== undefined ? phone : existing.phone;
  const newAddress = address !== undefined ? address : existing.address;
  const newPhoto = photo !== undefined ? photo : existing.photo;
  const newWorkHours = work_hours !== undefined ? work_hours : existing.work_hours;
  let newRoleId = existing.role_id;
  if ((role_id !== undefined || role !== undefined) && req.user.role === 'admin') {
    if (role !== undefined) {
      const r = db.get('SELECT id FROM roles WHERE name = ?', [role]);
      if (r) newRoleId = r.id;
    } else {
      newRoleId = role_id;
    }
  }

  db.run(
    'UPDATE users SET full_name = ?, phone = ?, address = ?, photo = ?, work_hours = ?, role_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [newName, newPhone, newAddress, newPhoto, newWorkHours, newRoleId, id]
  );

  const user = db.get(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [id]
  );
  res.json({ message: 'Данные обновлены', user });
}

function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ message: 'Неверный текущий пароль' });
  }
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ message: 'Новый пароль должен содержать не менее 6 символов' });
  }
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(new_password, 10), req.user.id]);
  res.json({ message: 'Пароль изменён' });
}

function deleteUser(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }
  db.run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ message: 'Пользователь удалён' });
}

module.exports = { listUsers, getUser, updateUser, changePassword, deleteUser, blockUser, unblockUser };
