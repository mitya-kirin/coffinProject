document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  if (!content) return;

  content.innerHTML = AdminLayout.wrap('/admin/orders.html', `<div id="innerContent"><div class="empty-state">Загрузка заказов...</div></div>`);
  const inner = document.getElementById('innerContent');

  let orders = [];
  let agents = [];

  async function load() {
    try {
      // ИСПРАВЛЕНО: Запрашиваем всех юзеров, чтобы не было ошибки 500
      const [oData, uData] = await Promise.all([
        API.get('/orders'),
        API.get('/users')
      ]);
      orders = oData.orders || [];
      // Фильтруем агентов прямо здесь
      agents = (uData.users || []).filter(u => u.role === 'agent');
      render();
    } catch (err) {
      inner.innerHTML = `<div class="alert alert-error show">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  function render() {
    if (orders.length === 0) {
      inner.innerHTML = `<div class="empty-state"><h3>Заказов пока нет</h3><p>Как только клиенты оформят заявки, они появятся здесь.</p></div>`;
      return;
    }

    inner.innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Номер</th><th>Клиент</th><th>Агент</th><th>Статус</th><th>Стоимость</th><th>Дата</th><th>Действия</th></tr></thead>
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
                <a class="btn btn-sm btn-outline" href="/order-details.html?id=${o.id}">Открыть</a>
                <button class="btn btn-sm btn-primary assignBtn" data-order="${o.id}">Агент</button>
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
    if (!order) return;
    
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
            <button class="btn btn-outline" id="cancelAssign">Отмена</button>
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