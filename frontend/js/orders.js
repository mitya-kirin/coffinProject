document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=/orders.html';
    return;
  }

  const wrap = document.getElementById('ordersTableWrap');
  const emptyEl = document.getElementById('ordersEmpty');
  const statusFilter = document.getElementById('statusFilter');
  const isAdmin = user.role === 'admin';
  const isAgent = user.role === 'agent';

  document.getElementById('ordersTitle').textContent =
    isAdmin ? 'Все заказы' : (isAgent ? 'Назначенные заказы' : 'Мои заказы');

  const STATUSES = [
    'Новая заявка', 'На рассмотрении', 'Назначен агент', 'Ожидаются документы',
    'Подготовка заказа', 'Подтверждено', 'Выполняется', 'Завершено', 'Отменено'
  ];

  const statusClass = (s) => {
    const map = {
      'Новая заявка': 'blue', 'На рассмотрении': 'yellow', 'Назначен агент': 'blue',
      'Ожидаются документы': 'yellow', 'Подготовка заказа': 'blue', 'Подтверждено': 'green',
      'Выполняется': 'blue', 'Завершено': 'green', 'Отменено': 'red'
    };
    return 'badge-' + (map[s] || 'gray');
  };

  async function load() {
    try {
      let url = '/orders';
      if (statusFilter.value) url += '?status=' + encodeURIComponent(statusFilter.value);
      const data = await API.get(url);
      const orders = data.orders;
      render(orders);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function render(orders) {
    if (!orders.length) {
      wrap.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    wrap.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Номер заказа</th>
            <th>Дата</th>
            ${isAdmin ? '<th>Клиент</th>' : ''}
            <th>Агент</th>
            <th>Услуг</th>
            <th>Стоимость</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><strong>${Auth.esc(o.order_number)}</strong></td>
              <td>${Auth.fmtDate(o.created_at)}</td>
              ${isAdmin ? `<td>${Auth.esc(o.client_name || '—')}</td>` : ''}
              <td>${Auth.esc(o.agent_name || '—')}</td>
              <td>${o.items_count !== undefined ? o.items_count : '—'}</td>
              <td>${Auth.money(o.total_price)}</td>
              <td><span class="badge ${statusClass(o.status)}">${Auth.esc(o.status)}</span></td>
              <td><a class="btn btn-sm btn-outline" href="order-details.html?id=${o.id}">Открыть</a></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  statusFilter.innerHTML = '<option value="">Все статусы</option>' +
    STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
  statusFilter.addEventListener('change', load);

  await load();
});