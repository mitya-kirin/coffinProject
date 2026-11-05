document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/cemeteries.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  async function load() {
    try {
      const data = await API.get('/cemeteries');
      const cems = data.cemeteries;
      inner.innerHTML = `
        <h2 class="mb-16">Кладбища</h2>
        <form class="card mini-form mb-16" id="addCemForm" style="padding:16px;">
          <div class="form-group"><input class="form-control" id="newCemName" placeholder="Название" required /></div>
          <div class="form-group" style="flex:1;"><input class="form-control" id="newCemAddr" placeholder="Адрес" /></div>
          <button class="btn btn-primary" type="submit">Добавить</button>
        </form>
        ${cems.map(c => `
          <div class="card mb-16" style="padding:18px;">
            <div class="row-flex" style="justify-content:space-between;">
              <div>
                <strong style="font-size:1.05rem;">${Auth.esc(c.name)}</strong>
                <div class="text-sm text-muted">${Auth.esc(c.address || '')}</div>
              </div>
              <div class="row-flex">
                <button class="btn btn-sm btn-gray toggleSectionsBtn" data-id="${c.id}">Участки</button>
                <button class="btn btn-sm btn-gray editCemBtn" data-id="${c.id}">Изменить</button>
                <button class="btn btn-sm btn-red delCemBtn" data-id="${c.id}">Удалить</button>
              </div>
            </div>
            <div class="hidden sectionsWrap" data-sections="${c.id}"></div>
          </div>`).join('')}`;

      inner.querySelectorAll('.delCemBtn').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Удалить кладбище?')) return;
        try { await API.del('/cemeteries/' + b.dataset.id); Common.showAlert('Удалено', 'success'); load(); }
        catch (err) { Common.showAlert(err.message, 'error'); }
      }));
      inner.querySelectorAll('.editCemBtn').forEach(b => b.addEventListener('click', () => {
        const c = cems.find(x => x.id === Number(b.dataset.id));
        const name = prompt('Название:', c.name);
        if (name === null) return;
        const addr = prompt('Адрес:', c.address || '') || '';
        API.put('/cemeteries/' + c.id, { name: name.trim(), address: addr }).then(() => { load(); Common.showAlert('Обновлено', 'success'); }).catch(e => Common.showAlert(e.message, 'error'));
      }));
      inner.querySelectorAll('.toggleSectionsBtn').forEach(b => b.addEventListener('click', async () => {
        const wrap = inner.querySelector(`[data-sections="${b.dataset.id}"]`);
        if (!wrap.classList.contains('hidden')) { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        wrap.innerHTML = '<p class="text-muted text-sm">Загрузка участков...</p>';
        try {
          const data = await API.get('/sections?cemetery_id=' + b.dataset.id);
          const sections = data.sections;
          wrap.innerHTML = `
            <div class="mt-16" style="background:var(--gray-light);border-radius:8px;padding:14px;">
              <div class="mini-form mb-8">
                <input class="form-control" id="secName" placeholder="Название участка" />
                <button class="btn btn-sm btn-primary" data-add-sec="${b.dataset.id}">Добавить участок</button>
              </div>
              <div class="table-wrap"><table class="table">
                <thead><tr><th>Участок</th><th></th></tr></thead>
                <tbody>
                  ${sections.map(s => `<tr>
                    <td><strong>${Auth.esc(s.name)}</strong>${s.description ? ' <span class="text-sm text-muted">— ' + Auth.esc(s.description) + '</span>' : ''}</td>
                    <td><button class="btn btn-sm btn-red" data-del-sec="${s.id}">Удалить</button></td>
                  </tr>`).join('') || '<tr><td class="text-muted text-sm">Участков нет</td></tr>'}
                </tbody>
              </table></div>
            </div>`;

          wrap.querySelector('[data-add-sec]').addEventListener('click', async () => {
            const name = wrap.querySelector(`#secName`).value.trim();
            if (!name) { Common.showAlert('Укажите название', 'error'); return; }
            await API.post('/sections', { cemetery_id: b.dataset.id, name });
            Common.showAlert('Участок добавлен', 'success');
            b.click();
          });
          wrap.querySelectorAll('[data-del-sec]').forEach(x => x.addEventListener('click', async () => {
            await API.del('/sections/' + x.dataset.delSec);
            Common.showAlert('Участок удалён', 'success');
            b.click();
          }));
        } catch (err) { wrap.innerHTML = `<p class="text-muted text-sm">${Auth.esc(err.message)}</p>`; }
      }));

      document.getElementById('addCemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await API.post('/cemeteries', { name: document.getElementById('newCemName').value.trim(), address: document.getElementById('newCemAddr').value.trim() });
          Common.showAlert('Кладбище добавлено', 'success');
          load();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  await load();
});