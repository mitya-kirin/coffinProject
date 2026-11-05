document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/index.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Загрузка...</p></div>';

  try {
    const data = await API.get('/admin/stats');
    const s = data.stats;
    inner.innerHTML = `
      <h2 class="mb-24">Обзор системы</h2>
      <div class="stat-grid">
        ${stat('Новые заявки', s.new_orders, '📦', 'blue')}
        ${stat('Активные заказы', s.active_orders, '🔄', 'yellow')}
        ${stat('Завершено', s.completed_orders, '✅', 'green')}
        ${stat('Всего заказов', s.total_orders, '🗂️', 'blue')}
        ${stat('Клиенты', s.clients, '👥', 'blue')}
        ${stat('Обработчики', s.agents, '🤝', 'blue')}
        ${stat('Свободные места', s.free_places, '🟢', 'green')}
        ${stat('Занятые места', s.occupied_places, '🔴', 'red')}
        ${stat('Зарезервировано', s.reserved_places, '🟡', 'yellow')}
        ${stat('Захоронения', s.burials, '⚰️', 'gray')}
        ${stat('Кладбища', s.cemeteries, '🏛️', 'blue')}
        ${stat('Услуги', s.services, '🛠️', 'blue')}
      </div>
      <div class="card mt-24" style="padding:20px;">
        <h3 class="mb-16">Последние заказы</h3>
        <div id="recentOrders"></div>
      </div>`;

    const orders = (await API.get('/orders')).orders;
    const recent = orders.slice(0, 8);
    document.getElementById('recentOrders').innerHTML = recent.length ? `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Номер</th><th>Клиент</th><th>Статус</th><th>Стоимость</th><th>Дата</th></tr></thead>
        <tbody>${recent.map(o => `
          <tr>
            <td><a href="../order-details.html?id=${o.id}"><strong>${Auth.esc(o.order_number)}</strong></a></td>
            <td>${Auth.esc(o.client_name || '')}</td>
            <td><span class="badge ${AdminLayout.statusClass(o.status)}">${Auth.esc(o.status)}</span></td>
            <td>${Auth.money(o.total_price)}</td>
            <td>${Auth.fmtDate(o.created_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>` : '<p class="text-muted">Заказов пока нет</p>';
  } catch (err) {
    inner.innerHTML = `<div class="alert show alert-error">${Auth.esc(err.message)}</div>`;
  }

  function stat(label, value, icon, color) {
    const bg = { blue: 'var(--blue-light)', green: 'var(--green-light)', red: 'var(--red-light)', yellow: 'var(--yellow-light)', gray: 'var(--gray-light)' };
    const fg = { blue: 'var(--blue)', green: 'var(--green)', red: 'var(--red)', yellow: '#9a7d0a', gray: 'var(--gray)' };
    return `<div class="stat-card">
      <div class="stat-icon" style="background:${bg[color] || bg.gray};color:${fg[color] || fg.gray};">${icon}</div>
      <div><div class="stat-value">${value ?? 0}</div><div class="stat-label">${label}</div></div>
    </div>`;
  }
});