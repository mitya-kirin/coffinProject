document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/users.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  async function load() {
    try {
      const data = await API.get('/users');
      users = data.users;
      render();
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function render() {
    // Filter: search, role, status
    const search = document.getElementById('userSearch').value.toLowerCase();
    const roleFilter = document.getElementById('userRoleFilter').value;
    const statusFilter = document.getElementById('userStatusFilter').value;

    let filtered = users.filter(u => {
      if (search && !u.full_name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
      if (roleFilter && roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'active' && u.is_blocked) return false;
        if (statusFilter === 'blocked' && !u.is_blocked) return false;
        if (statusFilter === 'client' && u.role !== 'client') return false;
        if (statusFilter === 'admin' && u.role !== 'admin') return false;
        if (statusFilter === 'agent' && u.role !== 'agent') return false;
      }
      return true;
    });

    inner.innerHTML = `
      <div class="toolbar mb-16" style="display:grid;gap:12px;align-items:end;">
        <div class="row-flex" style="gap:12px;flex-wrap:wrap;">
          <input class="form-control" id="userSearch" placeholder="Поиск..." style="min-width:200px;" />
          <select class="form-control" id="userRoleFilter">
            <option value="all">Все роли</option>
            <option value="client">Клиенты</option>
            <option value="admin">Администраторы</option>
            <option value="agent">Обработчики</option>
          </select>
          <select class="form-control" id="userStatusFilter">
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
          <button class="btn btn-primary" id="createClientBtn">+ Новый клиент</button>
          <button class="btn btn-outline" id="createAgentBtn">+ Обработчик</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>ФИО</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Статус</th><th>Дата регистрации</th><th>Действия</th></tr></thead>
        <tbody>
          ${filtered.map(u => `
            <tr>
              <td>${u.id}</td>
              <td><strong>${Auth.esc(u.full_name)}</strong></td>
              <td>${Auth.esc(u.email)}</td>
              <td>${Auth.esc(u.phone || '—')}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-blue' : u.role === 'agent' ? 'badge-yellow' : 'badge-gray'}">${Auth.roleName(u.role)}</span></td>
              <td><span class="badge ${u.is_blocked ? 'badge-red' : 'badge-green'}">${u.is_blocked ? 'Заблокирован' : 'Активен'}</span></td>
              <td>${u.role === 'client' ? Auth.fmtDate(u.created_at) : '—'}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-sm btn-outline" data-action="view" data-id="${u.id}">Подробности</button>
                ${u.role !== 'admin' ? `
                  <button class="btn btn-sm btn-outline" data-action="block" data-id="${u.id}">${u.is_blocked ? 'Разблокировать' : 'Заблокировать'}</button>
                  <button class="btn btn-sm btn-outline" data-action="set-role" data-id="${u.id}">Назначить роль</button>
                ` : '<span class="text-muted">Админ</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

    document.getElementById('userSearch').addEventListener('input', render);
    document.getElementById('userRoleFilter').addEventListener('change', render);
    document.getElementById('userStatusFilter').addEventListener('change', render);

    inner.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', async () => {
        const action = b.dataset.action;
        const id = b.dataset.id;
        if (action === 'view') {
          await showUserDetails(id);
        } else if (action === 'block') {
          if (!confirm(b.textContent === 'Заблокировать' ? 'Заблокировать этого пользователя?' : 'Разблокировать этого пользователя?')) return;
          try {
            await API.put(b.dataset.action === 'block' ? '/users/' + id + '/block' : '/users/' + id + '/unblock');
            Common.showAlert('Статус обновлён', 'success');
            load();
          } catch (err) { Common.showAlert(err.message, 'error'); }
        } else if (action === 'set-role') {
          await setRoleModal(id);
        }
      });
    });

    document.getElementById('createClientBtn').addEventListener('click', openClientModal);
    document.getElementById('createAgentBtn').addEventListener('click', openAgentModal);
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
        <div class="form-group"><label class="form-label">Рабочие часы</label><input type="text" class="form-control" id="aHours" placeholder="Пн-Пт 9:00-18:00" /></div>
        <div class="form-group"><label class="form-label form-required">Пароль</label><input type="password" class="form-control" id="aPass" minlength="6" /></div>
        <div class="modal-actions">
          <button class="btn btn-gray" id="cancelAgent">Отмена</button>
          <button class="btn btn-primary" id="saveAgent">Создать</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#cancelAgent').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveAgent').addEventListener('click', async () => {
      const btn = document.getElementById('saveAgent');
      Common.loading(btn, 'Создание...');
      try {
        await API.post('/admin/agents', {
          full_name: document.getElementById('aFullName').value.trim(),
          email: document.getElementById('aEmail').value.trim(),
          phone: document.getElementById('aPhone').value.trim(),
          work_hours: document.getElementById('aHours').value.trim(),
          password: document.getElementById('aPass').value
        });
        Common.showAlert('Агент создан', 'success');
        overlay.remove();
        load();
      } catch (err) { Common.showAlert(err.message, 'error'); }
      finally { Common.doneLoading(btn); }
    });
  }

  await load();
});