const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDatabase, persist } = require('./config/database');

async function start() {
  await initDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Static frontend serving (for production convenience)
  const frontendDir = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendDir));

  // Routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/users.routes'));
  app.use('/api', require('./routes/services.routes'));
  app.use('/api/orders', require('./routes/orders.routes'));
  app.use('/api', require('./routes/documents.routes'));
  app.use('/api/messages', require('./routes/messages.routes'));
  app.use('/api/notifications', require('./routes/notifications.routes'));
  app.use('/api', require('./routes/cemetery.routes'));
  app.use('/api/admin', require('./routes/admin.routes'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // SPA fallback — only for HTML navigations, never for assets
  app.get('*', (req, res) => {
    // If the requested path looks like a static asset that wasn't found, return 404, not HTML.
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map)$/i.test(req.path)) {
      return res.status(404).end();
    }
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  // Error handling + logging of admin actions
  app.use((err, req, res, next) => {
    if (err && err.message) {
      if (err.message.includes('type') || err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Недопустимый файл или превышен размер (до 5 МБ)' });
      }
    }
    console.error('[ERROR]', err && err.message, err && err.stack);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  });

  process.on('SIGINT', () => { try { persist(); } catch (e) {} process.exit(0); });

  app.listen(config.port, () => {
    console.log(`Сервер запущен: http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});
