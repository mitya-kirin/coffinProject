const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { signToken } = require('../middleware/auth.middleware');

function getRoleId(name) {
  const row = db.get('SELECT id FROM roles WHERE name = ?', [name]);
  return row ? row.id : null;
}

async function register(req, res) {
  const { full_name, email, phone, password, address } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Укажите ФИО, email и пароль' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Некорректный email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Пароль должен содержать не менее 6 символов' });
  }

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const roleId = getRoleId('client');

  db.run(
    'INSERT INTO users (role_id, full_name, email, phone, password_hash, address) VALUES (?, ?, ?, ?, ?, ?)',
    [roleId, full_name, email, phone || '', passwordHash, address || '']
  );
  const userId = db.lastInsertId();

  const user = db.get(
    'SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [userId]
  );

  return res.status(201).json({ message: 'Регистрация успешна', token: signToken(user), user });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Укажите email и пароль' });
  }

  const user = db.get(
    'SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
    [email]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  return res.json({ message: 'Вход выполнен', token: signToken(user), user });
}

async function logout(req, res) {
  res.json({ message: 'Выход выполнен' });
}

async function me(req, res) {
  const user = db.get(
    'SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.address, r.name AS role, u.photo, u.work_hours, u.created_at FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [req.user.id]
  );
  res.json({ user });
}

module.exports = { register, login, logout, me };
