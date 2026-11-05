const AdminLayout = (function () {
  function ensureAdmin() {
    const user = Auth.getUser();
    if (!Auth.isLoggedIn() || !user || user.role !== 'admin') {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  function renderSidebar(active) {
    const items = [
      ['admin/index.html', '📊', 'Dashboard'],
      ['admin/orders.html', '📦', 'Заказы'],
      ['admin/users.html', '👥', 'Пользователи'],
      ['admin/services.html', '🛠️', 'Услуги'],
      ['admin/categories.html', '🗂️', 'Категории'],
      ['admin/cemeteries.html', '🏛️', 'Кладбища'],
      ['admin/burial-places.html', '📍', 'Места'],
      ['admin/burials.html', '⚰️', 'Захоронения'],
      ['admin/documents.html', '📄', 'Документы'],
      ['admin/notifications.html', '🔔', 'Уведомления']
    ];
    return items.map(([href, icon, label]) =>
      `<a href="${href}" class="${active === href ? 'active' : ''}">${icon} ${label}</a>`).join('');
  }

  function wrap(active, content) {
    if (!ensureAdmin()) return '';
    return `
      <main>
        <div class="section">
          <div class="admin-layout">
            <aside class="admin-sidebar">
              <div class="card admin-nav">${renderSidebar(active)}</div>
            </aside>
            <div>${content}</div>
          </div>
        </div>
      </main>`;
  }

  function statusClass(status) {
    const map = {
      'Новая заявка': 'badge-blue',
      'На рассмотрении': 'badge-yellow',
      'Назначен агент': 'badge-blue',
      'Ожидаются документы': 'badge-yellow',
      'Подготовка заказа': 'badge-blue',
      'Подтверждено': 'badge-green',
      'Выполняется': 'badge-blue',
      'Завершено': 'badge-green',
      'Отменено': 'badge-red'
    };
    return map[status] || 'badge-gray';
  }

  return { ensureAdmin, renderSidebar, wrap, statusClass };
})();
window.AdminLayout = AdminLayout;