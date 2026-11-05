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
    // Убрали эмодзи
    const items = [
      ['/admin/orders.html', 'Заказы'],
      ['/admin/users.html', 'Пользователи'],
      ['/admin/services.html', 'Услуги'],
      ['/admin/categories.html', 'Категории'],
      ['/admin/cemeteries.html', 'Кладбища'],
      ['/admin/burial-places.html', 'Места'],
      ['/admin/burials.html', 'Захоронения'],
      ['/admin/documents.html', 'Документы'],
      ['/admin/notifications.html', 'Уведомления']
    ];
    return items.map(([href, label]) =>
      `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('');
  }

  function wrap(active, content) {
    if (!ensureAdmin()) return '';
    
    // Подключаем admin.css
    if (!document.getElementById('admin-css')) {
      const link = document.createElement('link');
      link.id = 'admin-css';
      link.rel = 'stylesheet';
      link.href = '/css/admin.css';
      document.head.appendChild(link);
    }

    // Жестко скрываем шапку сайта
    if (!document.getElementById('admin-header-hide')) {
      const style = document.createElement('style');
      style.id = 'admin-header-hide';
      style.innerHTML = 'header, #header, .site-header { display: none !important; } body { padding-top: 0 !important; margin: 0; }';
      document.head.appendChild(style);
    }

    return `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="logo" style="font-size: 1.1rem; letter-spacing: 2px;">РИТУАЛЬНАЯ СЛУЖБА</div>
          <div class="admin-nav">${renderSidebar(active)}</div>
          <div style="padding: 20px;">
             <a href="/index.html" class="btn btn-outline btn-block btn-sm" style="text-align:center; display:block;">На сайт</a>
          </div>
        </aside>
        <main class="admin-main">
          <div class="admin-header-top">
             <h1>${active.includes('orders') ? 'Заказы' : active.includes('users') ? 'Пользователи' : active.includes('services') ? 'Услуги' : active.includes('categories') ? 'Категории' : 'Панель управления'}</h1>
             <div class="admin-user-info">
               <strong style="color:var(--white);">Администратор</strong><br>
               <span style="color:var(--gray); font-size:0.8rem;">admin@ritual.ru</span>
             </div>
          </div>
          <div id="innerContent">${content}</div>
        </main>
      </div>`;
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