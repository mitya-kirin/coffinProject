document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  if (!content) return;

  content.innerHTML = AdminLayout.wrap('/admin/users.html', `<div id="innerContent"><div class="empty-state">Загрузка пользователей...</div></div>`);
  const inner = document.getElementById('innerContent');

  let users = [];

  async function load() {
    try {
      const data = await API.get('/users');
      users = data.users || [];
      render();
    } catch (err) {
      inner.innerHTML = `<div class="alert alert-error show">Ошибка: ${err.message}</div>`;
    }
  }

  function render() {
    const searchInput = document.getElementById('userSearch');
    const roleSelect = document.getElementById('userRoleFilter');
    const statusSelect = document.getElementById('userStatusFilter');

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const roleFilter = roleSelect ? roleSelect.value : 'all';
    const statusFilter = statusSelect ? statusSelect.value : 'all';

    let filtered = users.filter(u => {
      if (search && !u.full_name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && u.is_blocked) return false;
        if (statusFilter === 'blocked' && !u.is_blocked) return false;
      }
      return true;
    });

    const currentSearch = searchInput ? searchInput.value : '';
    
    inner.innerHTML = `
      <div class="toolbar mb-16" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <input class="form-control" id="userSearch" placeholder="Поиск по ФИО или Email..." style="max-width:300px;" value="${currentSearch}" />
        <select class="form-control" id="userRoleFilter" style="max-width:200px;">
          <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>Все роли</option>
          <option value="client" ${roleFilter === 'client' ? 'selected' : ''}>Клиенты</option>
          <option value="agent" ${roleFilter === 'agent' ? 'selected' : ''}>Обработчики</option>
          <option value="admin" ${roleFilter === 'admin' ? 'selected' : ''}>Администраторы</option>
        </select>
        <select class="form-control" id="userStatusFilter" style="max-width:200px;">
          <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Все статусы</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Активные</option>
          <option value="blocked" ${statusFilter === 'blocked' ? 'selected' : ''}>Заблокированные</option>
        </select>
        <button class="btn btn-primary" id="createAgentBtn" style="margin-left:auto;">+ Создать агента</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>ФИО</th><th>Email</th><th>Роль</th><th>Статус</th><th>Регистрация</th><th>Действия</th></tr></thead>
        <tbody>
          ${filtered.map(u => `
            <tr>
              <td>${u.id}</td>
              <td><strong>${Auth.esc(u.full_name)}</strong></td>
              <td>${Auth.esc(u.email)}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-blue' : u.role === 'agent' ? 'badge-yellow' : 'badge-gray'}">${Auth.roleName(u.role)}</span></td>
              <td><span class="badge ${u.is_blocked ? 'badge-red' : 'badge-green'}">${u.is_blocked ? 'Заблокирован' : 'Активен'}</span></td>
              <td>${u.role === 'client' ? Auth.fmtDate(u.created_at) : '—'}</td>
              <td style="white-space:nowrap;">
                ${u.role !== 'admin' ? `
                  <button class="btn btn-sm btn-outline" data-action="block" data-id="${u.id}">${u.is_blocked ? 'Разблокировать' : 'Заблокировать'}</button>
                ` : '<span class="text-muted">—</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

    if (searchInput) searchInput.addEventListener('input', render);
    if (roleSelect) roleSelect.addEventListener('change', render);
    if (statusSelect) statusSelect.addEventListener('change', render);

    inner.querySelectorAll('[data-action="block"]').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const isBlocking = b.textContent.includes('Заблокировать');
        if (!confirm(isBlocking ? 'Заблокировать пользователя?' : 'Разблокировать?')) return;
        try {
          await API.put(isBlocking ? '/users/' + id + '/block' : '/users/' + id + '/unblock');
          Common.showAlert('Статус обновлён', 'success');
          load();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });
    });

    const createAgentBtn = document.getElementById('createAgentBtn');
    if (createAgentBtn) {
      createAgentBtn.addEventListener('click', openAgentModal);
    }
  }

  function openAgentModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Создание агента</h3>
        <div class="form-group"><label class="form-label form-required">ФИО</label><input type="text" class="form-control" id="aFullName" /></div>
        <div class="form-group"><label class="form-label form-required">Email</label><input type="email" class="form-control" id="aEmail" /></div>
        <div class="form-group"><label class="form-label">Телефон</label><input type="tel" class="form-control" id="aPhone" /></div>
        <div class="form-group"><label class="form-label form-required">Пароль</label><input type="password" class="form-control" id="aPass" minlength="6" /></div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="cancelAgent">Отмена</button>
          <button class="btn btn-primary" id="saveAgent">Создать</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#cancelAgent').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveAgent').addEventListener('click', async () => {
      try {
        await API.post('/admin/agents', {
          full_name: document.getElementById('aFullName').value.trim(),
          email: document.getElementById('aEmail').value.trim(),
          phone: document.getElementById('aPhone').value.trim(),
          password: document.getElementById('aPass').value
        });
        Common.showAlert('Агент создан', 'success');
        overlay.remove();
        load();
      } catch (err) { Common.showAlert(err.message, 'error'); }
    });
  }

  await load();
});