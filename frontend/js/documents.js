document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=/documents.html';
    return;
  }

  const wrap = document.getElementById('docsWrap');
  const emptyEl = document.getElementById('docsEmpty');
  const sel = document.getElementById('docOrderSelect');
  let orders = [];

  const statusClass = (s) => {
    const map = { 'не предоставлен': 'gray', 'загружен': 'blue', 'на проверке': 'yellow', 'подтвержден': 'green', 'отклонен': 'red' };
    return 'badge-' + (map[s] || 'gray');
  };
  const statusText = (s) => {
    const map = { 'не предоставлен': 'Не предоставлен', 'загружен': 'Загружен', 'на проверке': 'На проверке', 'подтвержден': 'Подтверждён', 'отклонен': 'Отклонён' };
    return map[s] || s;
  };

  async function loadOrders() {
    const data = await API.get('/orders');
    orders = data.orders;
    sel.innerHTML = '<option value="">Выберите заказ</option>' +
      orders.map(o => `<option value="${o.id}">${Auth.esc(o.order_number)} — ${Auth.esc(o.status)}</option>`).join('');
    if (orders.length < 1) emptyEl.classList.remove('hidden');
  }

  async function renderDocs(orderId) {
    emptyEl.classList.add('hidden');
    if (!orderId) { wrap.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
    try {
      const data = await API.get('/orders/' + orderId + '/documents');
      const docs = data.documents;
      if (!docs.length) { wrap.innerHTML = `<p class="text-muted">Список документов пуст</p>`; return; }
      wrap.innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>Документ</th><th>Обязательность</th><th>Статус</th><th>Файл</th></tr></thead>
        <tbody>
          ${docs.map(d => `
            <tr>
              <td>
                <div style="font-weight:600;">${Auth.esc(d.name)}</div>
                <div class="text-sm text-muted">${Auth.esc(d.description || '')}</div>
                ${d.rejection_reason ? `<div class="text-sm" style="color:var(--red);">Причина отклонения: ${Auth.esc(d.rejection_reason)}</div>` : ''}
              </td>
              <td>${d.is_required ? '<span class="badge badge-red">Обязательный</span>' : '<span class="badge badge-gray">Необязательный</span>'}</td>
              <td><span class="badge ${statusClass(d.status)}">${statusText(d.status)}</span></td>
              <td>
                ${d.file_path ? `<a class="btn btn-sm btn-gray" href="/uploads/${encodeURIComponent(d.file_path)}" target="_blank">Скачать</a>` : '—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    } catch (err) {
      wrap.innerHTML = `<p class="text-muted text-sm">${Auth.esc(err.message)}</p>`;
    }
  }

  sel.addEventListener('change', () => renderDocs(sel.value));

  try {
    await loadOrders();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }
});