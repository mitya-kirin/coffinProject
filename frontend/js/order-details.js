document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  if (!orderId) { window.location.href = '/orders.html'; return; }

  const role = user.role;
  const isAdmin = role === 'admin';
  const isAgent = role === 'agent';

  const FLOW = ['Новая заявка', 'На рассмотрении', 'Назначен агент', 'Ожидаются документы', 'Подготовка заказа', 'Подтверждено', 'Выполняется', 'Завершено'];

  let order = null;
  let chatTimer = null;

  async function loadOrder() {
    try {
      const data = await API.get('/orders/' + orderId);
      order = data.order;
      render();
      startChat();
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function statusClass(s) {
    const map = {
      'Новая заявка': 'blue', 'На рассмотрении': 'yellow', 'Назначен агент': 'blue',
      'Ожидаются документы': 'yellow', 'Подготовка заказа': 'blue', 'Подтверждено': 'green',
      'Выполняется': 'blue', 'Завершено': 'green', 'Отменено': 'red'
    };
    return 'badge-' + (map[s] || 'gray');
  }

  function render() {
    document.getElementById('orderNumber').textContent = 'Заказ ' + order.order_number;
    document.getElementById('orderBreadcrumb').textContent = 'Главная / Заказы / ' + order.order_number;

    // Status steps
    const stepsEl = document.getElementById('statusSteps');
    const currentIdx = FLOW.indexOf(order.status);
    const isCancelled = order.status === 'Отменено';
    stepsEl.innerHTML = FLOW.map((s, i) => {
      const done = !isCancelled && currentIdx > i;
      const current = !isCancelled && currentIdx === i;
      return `${i > 0 ? '<span class="step-arrow">→</span>' : ''}
        <span class="step ${done ? 'done' : ''} ${current ? 'current' : ''}">${s}</span>`;
    }).join('');
    if (isCancelled) {
      stepsEl.insertBefore(htmlToNode(`<span class="step" style="background:var(--red-light);color:var(--red);">Отменено</span>`), stepsEl.lastChild);
    }
    const fillPct = isCancelled ? 0 : (currentIdx >= 0 ? Math.round(((currentIdx + 1) / FLOW.length) * 100) : 0);
    document.getElementById('statusProgress').style.width = fillPct + '%';
    const chip = document.getElementById('currentStatusChip');
    chip.className = 'badge ' + statusClass(order.status);
    chip.style.fontSize = '1rem';
    chip.style.padding = '10px 18px';
    chip.textContent = order.status;

    // Order info grid
    const infoGrid = document.getElementById('orderInfoGrid');
    infoGrid.innerHTML = `
      <div class="info-item"><div class="info-label">Номер заказа</div><div class="info-value">${Auth.esc(order.order_number)}</div></div>
      <div class="info-item"><div class="info-label">Дата создания</div><div class="info-value">${Auth.fmtDateTime(order.created_at)}</div></div>
      <div class="info-item"><div class="info-label">Дата обновления</div><div class="info-value">${Auth.fmtDateTime(order.updated_at)}</div></div>
      <div class="info-item"><div class="info-label">Желаемая дата</div><div class="info-value">${Auth.fmtDate(order.desired_date)}</div></div>
      <div class="info-item"><div class="info-label">Желаемое время</div><div class="info-value">${Auth.esc(order.desired_time || '—')}</div></div>
      <div class="info-item"><div class="info-label">Кладбище</div><div class="info-value">${Auth.esc(order.cemetery_name || '—')}</div></div>
      <div class="info-item"><div class="info-label">Место</div><div class="info-value">${order.place_row && order.place_number ? `${Auth.esc(order.section_name || '')} ряд ${order.place_row} № ${order.place_number}` : '—'}</div></div>
      <div class="info-item"><div class="info-label">Захоронение</div><div class="info-value">${order.need_burial ? 'Требуется' : 'Не требуется'}</div></div>
      <div class="info-item"><div class="info-label">Заявитель</div><div class="info-value">${Auth.esc(order.client_name || '')}</div></div>
      <div class="info-item"><div class="info-label">Телефон</div><div class="info-value">${Auth.esc(order.client_phone || '—')}</div></div>
      <div class="info-item"><div class="info-label">Email</div><div class="info-value">${Auth.esc(order.client_email || '—')}</div></div>
      <div class="info-item"><div class="info-label">Стоимость</div><div class="info-value">${Auth.money(order.total_price)}</div></div>
      <div class="info-item"><div class="info-label">Доставка</div><div class="info-value">${order.delivery_address ? Auth.esc(order.delivery_address) : 'Не требуется'}</div></div>
      <div class="info-item"><div class="info-label">Дата доставки</div><div class="info-value">${Auth.fmtDate(order.delivery_date)}</div></div>
      <div class="info-item"><div class="info-label">Статус доставки</div><div class="info-value">${Auth.esc(order.delivery_status || 'не требуется')}</div></div>`;

    if (order.comment) {
      infoGrid.insertAdjacentHTML('beforeend', `<div class="info-item" style="grid-column:1/-1;"><div class="info-label">Комментарий</div><div class="info-value">${Auth.esc(order.comment)}</div></div>`);
    }
    if (order.additional_info) {
      infoGrid.insertAdjacentHTML('beforeend', `<div class="info-item" style="grid-column:1/-1;"><div class="info-label">Дополнительные сведения</div><div class="info-value">${Auth.esc(order.additional_info)}</div></div>`);
    }

    // Items
    document.getElementById('itemsBody').innerHTML = order.items.map(it => `
      <tr>
        <td>${Auth.esc(it.service_name)}</td>
        <td>${Auth.esc(it.category_name || '')}</td>
        <td>${it.quantity}</td>
        <td>${Auth.money(it.price)}</td>
        <td>${Auth.money(it.total_price)}</td>
      </tr>`).join('') + `
      <tr><td colspan="4" style="text-align:right;font-weight:700;">Итого</td><td style="font-weight:700;">${Auth.money(order.total_price)}</td></tr>`;

    // Agent block
    fillAgent();
    fillDocs();
    fillHistory();
    renderActions();
  }

  function htmlToNode(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function fillAgent() {
    const el = document.getElementById('agentBlock');
    if (!order.agent_id) {
      el.innerHTML = `<p class="text-muted text-sm">Агент ещё не назначен. Администратор назначит его в ближайшее время.</p>`;
      return;
    }
    el.innerHTML = `
      <div class="row-flex mb-8">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--dark);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">
          ${Auth.esc((order.agent_name || 'А')[0])}
        </div>
        <div>
          <div style="font-weight:600;">${Auth.esc(order.agent_name || 'Агент')}</div>
          <div class="text-sm text-muted">${Auth.esc(order.agent_phone || '')} · ${Auth.esc(order.agent_email || '')}</div>
        </div>
      </div>
      <p class="text-sm text-muted">Рабочие часы: ${Auth.esc(order.agent_work_hours || 'не указаны')}</p>`;
  }

  function documentStatusClass(s) {
    const map = { 'не предоставлен': 'gray', 'загружен': 'blue', 'на проверке': 'yellow', 'подтвержден': 'green', 'отклонен': 'red' };
    return 'badge-' + (map[s] || 'gray');
  }

  function documentStatusText(s) {
    const map = { 'не предоставлен': 'Не предоставлен', 'загружен': 'Загружен', 'на проверке': 'На проверке', 'подтвержден': 'Подтверждён', 'отклонен': 'Отклонён' };
    return map[s] || s;
  }

  function fillDocs() {
    const el = document.getElementById('docsBlock');
    renderDocsInto(el);
  }

  async function renderDocsInto(el) {
    el.innerHTML = `<p class="text-muted text-sm">Загрузка документов...</p>`;
    try {
      const data = await API.get('/orders/' + order.id + '/documents');
      const docs = data.documents;
      if (!docs.length) { el.innerHTML = `<p class="text-muted text-sm">Список документов пуст</p>`; return; }
      el.innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>Документ</th><th>Обязательность</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          ${docs.map(d => `
            <tr>
              <td>
                <div style="font-weight:600;">${Auth.esc(d.name)}</div>
                <div class="text-sm text-muted">${Auth.esc(d.description || '')}</div>
                ${d.rejection_reason ? `<div class="text-sm" style="color:var(--red);">Причина: ${Auth.esc(d.rejection_reason)}</div>` : ''}
              </td>
              <td>${d.is_required ? '<span class="badge badge-red">Обязательный</span>' : '<span class="badge badge-gray">Необязательный</span>'}</td>
              <td><span class="badge ${documentStatusClass(d.status)}">${documentStatusText(d.status)}</span></td>
              <td>
                ${d.file_path ? `<a class="btn btn-sm btn-gray" href="/uploads/${encodeURIComponent(d.file_path)}" target="_blank">Скачать</a>` : ''}
                ${user.role === 'client' ? `
                  ${d.status === 'не предоставлен' || d.status === 'отклонен' ? `<div class="mt-8"><input type="file" class="text-sm" data-doc-file="${d.id}" data-doc-order="${order.id}" /><button class="btn btn-sm btn-primary mt-8" data-upload-doc="${d.id}">Загрузить</button></div>` : ''}
                  ${(['на проверке', 'загружен']).includes(d.status) ? `<button class="btn btn-sm btn-red mt-8" data-del-doc="${d.id}" data-doc-order="${order.id}">Отменить</button>` : ''}
                ` : ''}
                ${(isAgent || isAdmin) && d.file_path ? `
                  <div class="mt-8">
                    <button class="btn btn-sm btn-green" data-doc-status="${d.id}" data-status="подтвержден">Подтвердить</button>
                    <button class="btn btn-sm btn-red" data-doc-status="${d.id}" data-status="отклонен">Отклонить</button>
                  </div>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

      el.querySelectorAll('[data-upload-doc]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.uploadDoc;
          const fileInput = el.querySelector(`[data-doc-file="${id}"]`);
          if (!fileInput.files.length) { Common.showAlert('Выберите файл', 'error'); return; }
          const fd = new FormData();
          fd.append('file', fileInput.files[0]);
          fd.append('document_id', id);
          try {
            await API.upload('/orders/' + order.id + '/documents', fd);
            Common.showAlert('Документ загружен и отправлен на проверку', 'success');
            renderDocsInto(el);
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      });
      el.querySelectorAll('[data-del-doc]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.del('/documents/' + btn.dataset.delDoc);
            Common.showAlert('Файл удалён', 'success');
            renderDocsInto(el);
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      });
      el.querySelectorAll('[data-doc-status]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const status = btn.dataset.status;
          let reason = '';
          if (status === 'отклонен') {
            reason = prompt('Укажите причину отклонения:') || '';
            if (!reason) { Common.showAlert('Укажите причину отклонения', 'error'); return; }
          }
          try {
            const res = await API.patch('/documents/' + btn.dataset.docStatus + '/status', { status, rejection_reason: reason });
            Common.showAlert('Статус документа обновлён', 'success');
            renderDocsInto(el);
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      });
    } catch (err) {
      el.innerHTML = `<p class="text-muted text-sm">Ошибка загрузки документов</p>`;
    }
  }

  function fillHistory() {
    const el = document.getElementById('historyBlock');
    if (!order.status_history || !order.status_history.length) {
      el.innerHTML = `<p class="text-muted text-sm">Истории изменений нет</p>`;
      return;
    }
    el.innerHTML = `<ul style="display:grid;gap:10px;">` + order.status_history.map(h => `
      <li style="background:var(--gray-light);border-radius:8px;padding:10px 12px;">
        <div style="font-weight:600;font-size:0.92rem;">${(h.old_status ? h.old_status + ' → ' : '')}<strong>${Auth.esc(h.new_status)}</strong></div>
        <div class="text-sm text-muted">${Auth.fmtDateTime(h.created_at)}${h.comment ? ' · ' + Auth.esc(h.comment) : ''}</div>
      </li>`).join('') + `</ul>`;
  }

  function renderActions() {
    const cont = document.getElementById('pageHeadActions');
    if (isAdmin || isAgent) {
      cont.innerHTML = `
        <select class="form-control" id="statusSelect" style="min-width:190px;">
          ${['Новая заявка','На рассмотрении','Назначен агент','Ожидаются документы','Подготовка заказа','Подтверждено','Выполняется','Завершено','Отменено']
            .map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="changeStatusBtn">Изменить статус</button>`;
      document.getElementById('changeStatusBtn').addEventListener('click', async () => {
        const status = document.getElementById('statusSelect').value;
        try {
          await API.patch('/orders/' + order.id + '/status', { status });
          Common.showAlert('Статус изменён', 'success');
          await loadOrder();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });

      cont.insertAdjacentHTML('beforeend', `
        <select class="form-control" id="deliverySelect" style="min-width:170px;">
          ${['не требуется','оформлена','в пути','доставлена'].map(s =>
            `<option value="${s}" ${s === (order.delivery_status || 'не требуется') ? 'selected' : ''}>Доставка: ${s}</option>`).join('')}
        </select>`);
      document.getElementById('deliverySelect').addEventListener('change', async () => {
        const delivery_status = document.getElementById('deliverySelect').value;
        try {
          await API.put('/orders/' + order.id, { delivery_status });
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });

      if (isAdmin) {
        cont.insertAdjacentHTML('beforeend', `<button class="btn btn-outline" id="assignAgentBtn">Назначить агента</button>`);
        document.getElementById('assignAgentBtn').addEventListener('click', async () => {
          try {
            const users = await API.get('/users?role=agent');
            const agents = users.users;
            if (!agents.length) { Common.showAlert('Нет агентов', 'error'); return; }
            const names = agents.map(a => `${a.full_name} (${a.email})`).join('\n');
            const choice = prompt('Выберите агента по номеру:\n' + agents.map((a, i) => `${i + 1}. ${a.full_name} — ${a.email}`).join('\n'));
            if (!choice) return;
            const idx = parseInt(choice, 10);
            if (!idx || idx < 1 || idx > agents.length) { Common.showAlert('Неверный номер', 'error'); return; }
            await API.put('/orders/' + order.id, { agent_id: agents[idx - 1].id });
            Common.showAlert('Агент назначен', 'success');
            await loadOrder();
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      }
    }
  }

  // ---------- Chat ----------
  let currentChatOrder = orderId;
  const chatBox = document.getElementById('chatBox');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSendBtn');

  async function loadChat() {
    try {
      const data = await API.get('/messages?order_id=' + currentChatOrder);
      chatBox.innerHTML = data.messages.length ? data.messages.map(m => {
        const mine = Number(m.sender_id) === Number(user.id);
        return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}">
          <div>${Auth.esc(m.message)}</div>
          <div class="chat-meta">${Auth.esc(m.sender_name || '')} · ${Auth.fmtDateTime(m.created_at)}${mine ? '' : (m.is_read ? ' · прочитано' : ' · не прочитано')}</div>
        </div>`;
      }).join('') : `<div class="empty-state" style="padding:20px;"><p class="text-sm">Сообщений пока нет. Напишите первым.</p></div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
      API.patch('/messages/read-all?order_id=' + currentChatOrder, {}).catch(() => {});
    } catch (err) { /* ignore */ }
  }

  function startChat() {
    if (chatTimer) clearInterval(chatTimer);
    loadChat();
    chatTimer = setInterval(loadChat, 8000);
  }

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    let receiver = null;
    if (isAdmin || isAgent) receiver = order.client_id;
    try {
      await API.post('/messages', { order_id: currentChatOrder, receiver_id: receiver, message: text });
      chatInput.value = '';
      loadChat();
    } catch (err) { Common.showAlert(err.message, 'error'); }
  }

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  await loadOrder();
  window.addEventListener('beforeunload', () => { if (chatTimer) clearInterval(chatTimer); });
});