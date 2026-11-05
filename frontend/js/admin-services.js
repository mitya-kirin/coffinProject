document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/services.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  let categories = [];

  async function load() {
    try {
      const [sData, cData] = await Promise.all([API.get('/services'), API.get('/categories')]);
      const services = sData.services;
      categories = cData.categories;
      render(services);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function render(services) {
    inner.innerHTML = `
      <h2 class="mb-16">Услуги</h2>
      <button class="btn btn-primary mb-16" id="addServiceBtn">+ Добавить услугу</button>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Название</th><th>Категория</th><th>Цена</th><th>Ед.</th><th>Активна</th><th></th></tr></thead>
        <tbody>
          ${services.map(s => `
            <tr>
              <td>${Auth.esc(s.name)}<div class="text-sm text-muted">${Auth.esc(s.description || '')}</div></td>
              <td>${Auth.esc(s.category_name || '—')}</td>
              <td><strong>${Auth.money(s.price)}</strong></td>
              <td>${Auth.esc(s.unit || '')}</td>
              <td>${s.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-gray">Нет</span>'}</td>
              <td>
                <button class="btn btn-sm btn-gray editBtn" data-id="${s.id}">Изменить</button>
                <button class="btn btn-sm btn-red delBtn" data-id="${s.id}">Удалить</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

    inner.querySelectorAll('.delBtn').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Удалить услугу?')) return;
      try { await API.del('/services/' + b.dataset.id); Common.showAlert('Удалено', 'success'); load(); }
      catch (err) { Common.showAlert(err.message, 'error'); }
    }));
    inner.querySelectorAll('.editBtn').forEach(b => b.addEventListener('click', () => {
      const s = services.find(x => x.id === Number(b.dataset.id));
      openModal(s);
    }));
    document.getElementById('addServiceBtn').addEventListener('click', () => openModal(null));
  }

  function openModal(service) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${service ? 'Редактирование услуги' : 'Новая услуга'}</h3>
        <div class="form-group"><label class="form-label form-required">Название</label><input class="form-control" id="mName" value="${service ? Auth.esc(service.name) : ''}" /></div>
        <div class="form-group"><label class="form-label">Категория</label>
          <select class="form-control" id="mCat">
            <option value="">Без категории</option>
            ${categories.map(c => `<option value="${c.id}" ${service && service.category_id === c.id ? 'selected' : ''}>${Auth.esc(c.name)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Описание</label><textarea class="form-control" id="mDesc">${service ? Auth.esc(service.description || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label form-required">Цена</label><input type="number" class="form-control" id="mPrice" value="${service ? service.price : ''}" /></div>
          <div class="form-group"><label class="form-label">Единица</label><input class="form-control" id="mUnit" value="${service ? Auth.esc(service.unit || '') : ''}" placeholder="услуга" /></div>
        </div>
        <div class="form-group"><label class="form-label">Активна</label>
          <select class="form-control" id="mActive"><option value="1" ${!service || service.is_active ? 'selected' : ''}>Да</option><option value="0" ${service && !service.is_active ? 'selected' : ''}>Нет</option></select></div>
        <div class="modal-actions">
          <button class="btn btn-gray" id="cancelM">Отмена</button>
          <button class="btn btn-primary" id="saveM">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#cancelM').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveM').addEventListener('click', async () => {
      const body = {
        name: document.getElementById('mName').value.trim(),
        category_id: document.getElementById('mCat').value ? Number(document.getElementById('mCat').value) : null,
        description: document.getElementById('mDesc').value.trim(),
        price: Number(document.getElementById('mPrice').value) || 0,
        unit: document.getElementById('mUnit').value.trim(),
        is_active: document.getElementById('mActive').value === '1' ? 1 : 0
      };
      try {
        if (service) await API.put('/services/' + service.id, body);
        else await API.post('/services', body);
        Common.showAlert('Сохранено', 'success');
        overlay.remove();
        load();
      } catch (err) { Common.showAlert(err.message, 'error'); }
    });
  }

  await load();
});