document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/categories.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  async function load() {
    try {
      const data = await API.get('/categories');
      const cats = data.categories;
      inner.innerHTML = `
        <h2 class="mb-16">Категории услуг</h2>
        <form class="card mini-form mb-16" id="addCatForm" style="padding:16px;">
          <div class="form-group"><input class="form-control" id="newCatName" placeholder="Название категории" required /></div>
          <div class="form-group" style="flex:1;"><input class="form-control" id="newCatDesc" placeholder="Описание" /></div>
          <button class="btn btn-primary" type="submit">Добавить</button>
        </form>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Название</th><th>Описание</th><th></th></tr></thead>
          <tbody>
            ${cats.map(c => `
              <tr>
                <td><strong>${Auth.esc(c.name)}</strong></td>
                <td>${Auth.esc(c.description || '')}</td>
                <td>
                  <button class="btn btn-sm btn-gray editCatBtn" data-id="${c.id}">Изменить</button>
                  <button class="btn btn-sm btn-red delCatBtn" data-id="${c.id}">Удалить</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>`;

      inner.querySelectorAll('.delCatBtn').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Удалить категорию?')) return;
        try { await API.del('/categories/' + b.dataset.id); Common.showAlert('Удалено', 'success'); load(); }
        catch (err) { Common.showAlert(err.message, 'error'); }
      }));
      inner.querySelectorAll('.editCatBtn').forEach(b => b.addEventListener('click', () => {
        const c = cats.find(x => x.id === Number(b.dataset.id));
        const name = prompt('Название категории:', c.name);
        if (name === null) return;
        const desc = prompt('Описание:', c.description || '') || '';
        API.put('/categories/' + c.id, { name: name.trim(), description: desc }).then(() => { load(); Common.showAlert('Обновлено', 'success'); }).catch(e => Common.showAlert(e.message, 'error'));
      }));
      document.getElementById('addCatForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await API.post('/categories', { name: document.getElementById('newCatName').value.trim(), description: document.getElementById('newCatDesc').value.trim() });
          Common.showAlert('Категория добавлена', 'success');
          load();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  await load();
});