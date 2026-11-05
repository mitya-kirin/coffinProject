document.addEventListener('DOMContentLoaded', async function () {
  if (!AdminLayout.ensureAdmin()) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = AdminLayout.wrap('admin/notifications.html', `<div id="innerContent"></div>`);
  const inner = document.getElementById('innerContent');
  inner.innerHTML = '<div class="empty-state">Загрузка...</div>';

  async function load() {
    try {
      const data = await API.get('/notifications');
      const notifs = data.notifications;
      inner.innerHTML = `
        <h2 class="mb-16">Уведомления</h2>
        ${notifs.length ? notifs.map(n => `
          <div class="card mb-8" style="padding:14px 18px;flex-direction:row;align-items:flex-start;gap:14px;${n.is_read ? 'opacity:0.7;' : ''}">
            <div style="font-size:1.5rem;">${n.type === 'status' ? '🔄' : n.type === 'message' ? '💬' : n.type === 'document' ? '📄' : n.type === 'reminder' ? '⏰' : '🔔'}</div>
            <div style="flex:1;">
              <div style="font-weight:600;">${Auth.esc(n.title)}</div>
              <div class="text-sm mt-8">${Auth.esc(n.message)}</div>
              <div class="text-sm text-muted mt-8">${Auth.fmtDateTime(n.created_at)}</div>
            </div>
          </div>`).join('') : '<p class="text-muted">Уведомлений нет</p>'}
      `;
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  await load();
});