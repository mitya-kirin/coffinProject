document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/documents.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  async function load() {
    try {
      const data = await API.get('/documents/templates');
      const docs = data.documents;
      inner.innerHTML = `
        <h2 class="mb-16">Шаблоны документов</h2>
        <form class="card mini-form mb-16" id="addDocForm" style="padding:16px;">
          <div class="form-group"><input class="form-control" id="newDocName" placeholder="Название документа" required /></div>
          <div class="form-group" style="flex:1;"><input class="form-control" id="newDocDesc" placeholder="Описание" /></div>
          <div class="form-group"><label class="form-label">Обязательность</label>
            <select class="form-control" id="newDocReq"><option value="1">Обязательный</option><option value="0">Необязательный</option></select></div>
          <button class="btn btn-primary" type="submit">Добавить</button>
        </form>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Название</th><th>Описание</th><th>Обязательность</th><th></th></tr></thead>
          <tbody>
            ${docs.map(d => `
              <tr>
                <td><strong>${Auth.esc(d.name)}</strong></td>
                <td>${Auth.esc(d.description || '')}</td>
                <td>${d.is_required ? '<span class="badge badge-red">Обязательный</span>' : '<span class="badge badge-gray">Необязательный</span>'}</td>
                <td><button class="btn btn-sm btn-red" data-del-doc="${d.id}">Удалить</button></td>
              </tr>`).join('')}
          </tbody>
        </table></div>`;

      inner.querySelectorAll('[data-del-doc]').forEach(b => b.addEventListener('click', async () => {
        // Delete via template is not destructive to order docs, so use template delete if existed; here we keep documents.
        Common.showAlert('Удаление шаблонов документов в текущей версии не предусмотрено', 'info');
      }));
      document.getElementById('addDocForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await API.post('/documents/templates', {
            name: document.getElementById('newDocName').value.trim(),
            description: document.getElementById('newDocDesc').value.trim(),
            is_required: document.getElementById('newDocReq').value === '1' ? 1 : 0
          });
          Common.showAlert('Документ добавлен', 'success');
          load();
        } catch (err) { Common.showAlert(err.message, 'error'); }
      });
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  await load();
});