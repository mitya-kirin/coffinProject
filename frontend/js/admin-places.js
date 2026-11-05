document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/burial-places.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  let cemeteries = [];

  const STATUS_LABEL = { 'свободно': 'Свободно', 'занято': 'Занято', 'зарезервировано': 'Зарезервировано', 'недоступно': 'Недоступно' };

  async function loadCems() {
    const data = await API.get('/cemeteries');
    cemeteries = data.cemeteries;
  }

  async function render(filterCem = '') {
    try {
      let url = '/burial-places';
      if (filterCem) url += '?cemetery_id=' + filterCem;
      const data = await API.get(url);
      const places = data.places;

      inner.innerHTML = `
        <h2 class="mb-16">Места захоронений</h2>
        <div class="toolbar mb-16">
          <select class="form-control" id="placeFilterCem">
            <option value="">Все кладбища</option>
            ${cemeteries.map(c => `<option value="${c.id}" ${String(c.id) === filterCem ? 'selected' : ''}>${Auth.esc(c.name)}</option>`).join('')}
          </select>
          <button class="btn btn-primary" id="addPlaceBtn">+ Добавить место</button>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Кладбище</th><th>Участок</th><th>Ряд</th><th>№</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            ${places.map(p => `
              <tr>
                <td>${Auth.esc(p.cemetery_name || '')}</td>
                <td>${Auth.esc(p.section_name || '')}</td>
                <td>${p.row_number || '—'}</td>
                <td><strong>${p.place_number || '—'}</strong></td>
                <td><span class="badge ${p.status === 'свободно' ? 'badge-green' : p.status === 'занято' ? 'badge-red' : p.status === 'зарезервировано' ? 'badge-yellow' : 'badge-gray'}">${STATUS_LABEL[p.status] || p.status}</span></td>
                <td>
                  <select class="form-control" style="display:inline-block;width:auto;min-width:150px;padding:6px 10px;height:auto;" data-place-status="${p.id}">
                    ${Object.keys(STATUS_LABEL).map(s => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
                  </select>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>`;

      inner.querySelectorAll('[data-place-status]').forEach(sel => {
        sel.addEventListener('change', async () => {
          try {
            await API.put('/burial-places/' + sel.dataset.placeStatus, { status: sel.value });
            Common.showAlert('Статус обновлён', 'success');
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      });
      document.getElementById('addPlaceBtn').addEventListener('click', openAddModal);
      document.getElementById('placeFilterCem').addEventListener('change', () => render(document.getElementById('placeFilterCem').value));
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  async function openAddModal() {
    const sections = {};
    try {
      const data = await API.get('/sections');
      data.sections.forEach(s => { (sections[s.cemetery_id] = sections[s.cemetery_id] || []).push(s); });
    } catch (e) {}

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Добавить место</h3>
        <div class="form-group"><label class="form-label form-required">Кладбище</label>
          <select class="form-control" id="pCem">${cemeteries.map(c => `<option value="${c.id}">${Auth.esc(c.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label form-required">Участок</label>
          <select class="form-control" id="pSection"></select></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Ряд</label><input type="number" class="form-control" id="pRow" min="1" /></div>
          <div class="form-group"><label class="form-label">Место</label><input type="number" class="form-control" id="pNum" min="1" /></div>
        </div>
        <div class="form-group"><label class="form-label">Статус</label>
          <select class="form-control" id="pStatus">${Object.keys(STATUS_LABEL).map(s => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join('')}</select></div>
        <div class="modal-actions">
          <button class="btn btn-gray" id="cancelPlace">Отмена</button>
          <button class="btn btn-primary" id="savePlace">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const cemSel = overlay.querySelector('#pCem');
    const secSel = overlay.querySelector('#pSection');
    function fillSections() {
      const list = sections[cemSel.value] || [];
      secSel.innerHTML = list.map(s => `<option value="${s.id}">${Auth.esc(s.name)}</option>`).join('');
    }
    cemSel.addEventListener('change', fillSections);
    fillSections();

    overlay.querySelector('#cancelPlace').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#savePlace').addEventListener('click', async () => {
      if (cemeteries.length && !sections[cemSel.value]) {
        Common.showAlert('Сначала создайте участок для кладбища', 'error');
        return;
      }
      try {
        await API.post('/burial-places', {
          section_id: Number(secSel.value),
          row_number: document.getElementById('pRow').value ? Number(document.getElementById('pRow').value) : null,
          place_number: document.getElementById('pNum').value ? Number(document.getElementById('pNum').value) : null,
          status: document.getElementById('pStatus').value
        });
        Common.showAlert('Место добавлено', 'success');
        overlay.remove();
        render(document.getElementById('placeFilterCem').value);
      } catch (err) { Common.showAlert(err.message, 'error'); }
    });
  }

  try { await loadCems(); await render(); } catch (err) { Common.showAlert(err.message, 'error'); }
});