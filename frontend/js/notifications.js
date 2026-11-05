document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=/notifications.html';
    return;
  }

  const listEl = document.getElementById('notifList');
  const emptyEl = document.getElementById('notifEmpty');
  const markAllBtn = document.getElementById('markAllBtn');

  const TYPE_ICONS = {
    order_created: '📦', order_new: '📦', status: '🔄', message: '💬',
    document: '📄', reminder: '⏰', price: '💰', general: '🔔'
  };

  async function load() {
    try {
      const data = await API.get('/notifications');
      const notifs = data.notifications;
      emptyEl.classList.toggle('hidden', notifs.length > 0);
      listEl.innerHTML = notifs.map(n => `
        <div class="card mb-8" style="padding:14px 18px;flex-direction:row;align-items:flex-start;gap:14px;${n.is_read ? 'opacity:0.7;' : ''}">
          <div style="font-size:1.6rem;">${TYPE_ICONS[n.type] || TYPE_ICONS.general}</div>
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--dark);">${Auth.esc(n.title)}</div>
            <div class="text-sm mt-8">${Auth.esc(n.message)}</div>
            <div class="text-sm text-muted mt-8">${Auth.fmtDateTime(n.created_at)}</div>
          </div>
          ${!n.is_read ? `<button class="btn btn-sm btn-outline" data-read="${n.id}">Прочитано</button>` : ''}
        </div>`).join('') || '';
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-read]');
    if (!btn) return;
    try {
      await API.patch('/notifications/' + btn.dataset.read + '/read', {});
      await load();
      if (window.Common && Common.updateNotifBadge) Common.updateNotifBadge();
    } catch (err) { Common.showAlert(err.message, 'error'); }
  });

  markAllBtn.addEventListener('click', async () => {
    try {
      await API.patch('/notifications/read-all', {});
      await load();
      if (window.Common && Common.updateNotifBadge) Common.updateNotifBadge();
    } catch (err) { Common.showAlert(err.message, 'error'); }
  });

  await load();
});