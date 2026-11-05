document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/orders.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  let orders = [];
  let agents = [];

  async function load() {
    try {
      const [oData, uData] = await Promise.all([
        API.get('/orders'),
        API.get('/users?role=agent')
      ]);
      orders = oData.orders;
      agents = uData.users;
      render();
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  const statuses = ['Новая заявка','На рассмотрении','Назначен агент','Ожидаются документы','Подготовка заказа','Подтверждено','Выполняется','Завершено','Отменено'];

  function render() {
    inner.innerHTML = `
      <h2 class="mb-16">Заказы</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Номер</th><th>Клиент</th><th>Агент</th><th>Статус</th><th>Стоимость</th><th>Дата</th><th></th></tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><strong>${Auth.esc(o.order_number)}</strong></td>
              <td>${Auth.esc(o.client_name || '')}</td>
              <td>${Auth.esc(o.agent_name || '—')}</td>
              <td><span class="badge ${AdminLayout.statusClass(o.status)}">${Auth.esc(o.status)}</span></td>
              <td>${Auth.money(o.total_price)}</td>
              <td>${Auth.fmtDate(o.created_at)}</td>
              <td>
                <a class="btn btn-sm btn-outline" href="../order-details.html?id=${o.id}">Открыть</a>
                <button class="btn btn-sm btn-gray assignBtn" data-order="${o.id}">Агент</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

    inner.querySelectorAll('.assignBtn').forEach(b => {
      b.addEventListener('click', () => openAssignModal(Number(b.dataset.order)));
    });
  }

  function openAssignModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Назначить агента — ${Auth.esc(order.order_number)}</h3>
        ${agents.length ? `
          <label class="form-label">Агент</label>
          <select class="form-control mb-16" id="agentSel">
            ${agents.map(a => `<option value="${a.id}">${Auth.esc(a.full_name)} (${Auth.esc(a.email)})</option>`).join('')}
          </select>
          <div class="modal-actions">
            <button class="btn btn-gray" id="cancelAssign">Отмена</button>
            <button class="btn btn-primary" id="saveAssign">Назначить</button>
          </div>` : '<p class="text-muted">Агенты не найдены</p>'}
      </div>`;
    document.body.appendChild(overlay);

    if (agents.length) {
      overlay.querySelector('#cancelAssign').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#saveAssign').addEventListener('click', async () => {
        const agentId = Number(document.getElementById('agentSel').value);
        try {
          await API.put('/orders/' + orderId, { agent_id: agentId });
          Common.showAlert('Агент назначен', 'success');
          overlay.remove();
          load();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });
    }
  }

  await load();
});