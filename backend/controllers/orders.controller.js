const { all } = require('../config/database');

exports.getAll = (req, res) => {
  try {
    // Достаем заказы, подтягивая имена клиента и агента
    let orders = [];
    try {
      orders = all(`
        SELECT o.*, c.full_name as client_name, a.full_name as agent_name 
        FROM orders o
        LEFT JOIN users c ON o.client_id = c.id
        LEFT JOIN users a ON o.agent_id = a.id
      `);
    } catch (e) {
      // Если таблица заказов пуста, просто отдаем пустой массив
      console.log("Таблица заказов пуста или не создана");
    }
    res.json({ orders: orders || [] });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка загрузки заказов' });
  }
};