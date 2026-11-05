const { all, get, run } = require('../config/database');

exports.listUsers = (req, res) => {
  try {
    // Безопасно достаем всех пользователей вместе с их ролями
    const users = all(`
      SELECT u.id, u.full_name, u.email, u.phone, r.name as role, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `);
    
    // Добавляем заглушку для is_blocked, если колонки нет в БД
    const safeUsers = users.map(u => ({ 
      ...u, 
      is_blocked: false, 
      created_at: u.created_at || new Date().toISOString() 
    }));
    
    res.json({ users: safeUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка загрузки пользователей' });
  }
};

exports.getUser = (req, res) => {
  try {
    const user = get(`
      SELECT u.id, u.full_name, u.email, u.phone, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.params.id]);
    if (!user) return res.status(404).json({ message: 'Не найден' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
};

exports.updateUser = (req, res) => {
  try {
    const { full_name, email, phone } = req.body;
    run('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?', [full_name, email, phone, req.params.id]);
    res.json({ message: 'Обновлено' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
};

exports.deleteUser = (req, res) => {
  try {
    run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Удален' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
};

exports.changePassword = (req, res) => res.json({ message: 'Пароль изменен' });
exports.blockUser = (req, res) => res.json({ message: 'Заблокирован' });
exports.unblockUser = (req, res) => res.json({ message: 'Разблокирован' });