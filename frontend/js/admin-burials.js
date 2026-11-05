document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/burials.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  let places = [];

  async function load() {
    try {
      const [bData, placesData] = await Promise.all([API.get('/burials'), API.get('/burial-places?status=свободно')]);
      const burials = bData.burials;
      places = placesData.places;

      inner.innerHTML = `
        <h2 class="mb-16">Захоронения</h2>
        <button class="btn btn-primary mb-16" id="addBurialBtn">+ Добавить захоронение</button>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>ФИО</th><th>Даты жизни</th><th>Дата захоронения</th><th>Кладбище / участок</th><th>Место</th><th></th></tr></thead>
          <tbody>
            ${burials.map(b => `
              <tr>
                <td><strong>${Auth.esc(b.full_name)}</strong></td>
                <td>${Auth.fmtDate(b.birth_date)} — ${Auth.fmtDate(b.death_date)}</td>
                <td>${Auth.fmtDate(b.burial_date)}</td>
                <td>${Auth.esc(b.cemetery_name || '')} / ${Auth.esc(b.section_name || '')}</td>
                <td>ряд ${b.row_number || '—'}, № ${b.place_number || '—'}</td>
                <td><button class="btn btn-sm btn-red" data-del-burial="${b.id}">Удалить</button></td>
              </tr>`).join('')}
          </tbody>
        </table></div>`;

      inner.querySelectorAll('[data-del-burial]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Удалить запись о захоронении? Место станет свободным.')) return;
        try { await API.del('/burials/' + b.dataset.delBurial); Common.showAlert('Удалено', 'success'); load(); }
        catch (err) { Common.showAlert(err.message, 'error'); }
      }));
      document.getElementById('addBurialBtn').addEventListener('click', openModal);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function openModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Новое захоронение</h3>
        <div class="form-group"><label class="form-label form-required">Место</label>
          <select class="form-control" id="bPlace">
            <option value="">Выберите свободное место</option>
            ${places.map(p => `<option value="${p.id}">${Auth.esc(p.cemetery_name)} / ${Auth.esc(p.section_name)} / ряд ${p.row_number || '-'} / № ${p.place_number || '-'}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label form-required">ФИО</label><input class="form-control" id="bName" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Дата рождения</label><input type="date" class="form-control" id="bBirth" /></div>
          <div class="form-group"><label class="form-label">Дата смерти</label><input type="date" class="form-control" id="bDeath" /></div>
        </div>
        <div class="form-group"><label class="form-label">Дата захоронения</label><input type="date" class="form-control" id="bBurialDate" /></div>
        <div class="form-group"><label class="form-label">Описание</label><textarea class="form-control" id="bDesc"></textarea></div>
        <div class="modal-actions">
          <button class="btn btn-gray" id="cancelB">Отмена</button>
          <button class="btn btn-primary" id="saveB">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#cancelB').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveB').addEventListener('click', async () => {
      try {
        await API.post('/burials', {
          burial_place_id: Number(document.getElementById('bPlace').value),
          full_name: document.getElementById('bName').value.trim(),
          birth_date: document.getElementById('bBirth').value || null,
          death_date: document.getElementById('bDeath').value || null,
          burial_date: document.getElementById('bBurialDate').value || null,
          description: document.getElementById('bDesc').value.trim()
        });
        Common.showAlert('Захоронение добавлено', 'success');
        overlay.remove();
        load();
      } catch (err) { Common.showAlert(err.message, 'error'); }
    });
  }

  await load();
});