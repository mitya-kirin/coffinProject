const Common = (function () {
  function currentPage() {
    const p = window.location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function publicNav(active) {
    const items = [
      ['index.html', 'Главная'],
      ['services.html', 'Услуги'],
      ['calculator.html', 'Рассчитать стоимость'],
      ['order.html', 'Оформить заявку'],
      ['cemetery.html', 'Карта кладбища'],
      ['burial-search.html', 'Поиск захоронений']
    ];
    return items.map(([href, label]) =>
      `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`
    ).join('');
  }

  function clientNav(active) {
    return publicNav(active) +
      `<a href="orders.html" class="${active === 'orders.html' ? 'active' : ''}">Мои заказы</a>
       <a href="documents.html" class="${active === 'documents.html' ? 'active' : ''}">Документы</a>
       <a href="messages.html" class="${active === 'messages.html' ? 'active' : ''}">Сообщения</a>
       <a href="notifications.html" class="${active === 'notifications.html' ? 'active' : ''}">Уведомления<span class="nav-badge" id="navNotifBadge" style="display:none"></span></a>`;
  }

  function agentNav(active) {
    return [
      ['index.html', 'Главная'],
      ['orders.html', 'Мои заказы'],
      ['cemetery.html', 'Карта кладбища'],
      ['burial-search.html', 'Поиск захоронений'],
      ['messages.html', 'Сообщения'],
      ['notifications.html', 'Уведомления<span class="nav-badge" id="navNotifBadge" style="display:none"></span>']
    ].map(([href, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('');
  }

  function adminNav(active) {
    const links = [
      ['/admin/index.html', 'Dashboard'],
      ['/admin/orders.html', 'Заказы'],
      ['/admin/users.html', 'Пользователи'],
      ['/admin/services.html', 'Услуги'],
      ['/admin/categories.html', 'Категории'],
      ['/admin/cemeteries.html', 'Кладбища'],
      ['/admin/burial-places.html', 'Места'],
      ['/admin/burials.html', 'Захоронения'],
      ['/admin/documents.html', 'Документы'],
      ['/admin/notifications.html', 'Уведомления<span class="nav-badge" id="navNotifBadge" style="display:none"></span>']
    ];
    return links.map(([href, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('');
  }

  function navForRole(role, active) {
    if (role === 'admin') return adminNav(active);
    if (role === 'agent') return agentNav(active);
    if (role === 'client') return clientNav(active);
    return publicNav(active);
  }

  function renderHeader() {
    const active = currentPage();
    const user = Auth.getUser();
    const loggedIn = Auth.isLoggedIn();
    const base = currentPage().startsWith('admin') ? '../' : '';
    const logo = `<a class="logo" href="${base}index.html"><span class="logo-badge">✦</span> Ритуальная<br>служба</a>`;

    let menu = '';
    if (loggedIn && user) {
      menu = `
        <div class="user-menu">
          <a class="user-chip" href="${user.role === 'admin' ? '/admin/index.html' : user.role === 'agent' ? 'orders.html' : 'profile.html'}" title="Личный кабинет">👤 ${Auth.esc(user.full_name || user.email)} (${Auth.roleName(user.role)})</a>
          <button class="btn btn-sm btn-red" id="logoutBtn">Выйти</button>
        </div>`;
    } else {
      menu = `
        <div class="user-menu">
          <a href="login.html" class="btn btn-sm btn-outline" style="color:#fff;border-color:rgba(255,255,255,.5)">Войти</a>
          <a href="register.html" class="btn btn-sm btn-red">Регистрация</a>
        </div>`;
    }

    const navHtml = navForRole(loggedIn && user ? user.role : null, active);
    document.getElementById('header').innerHTML = `
      <div class="header-inner">
        ${logo}
        <button class="burger" id="burgerBtn" aria-label="Меню">☰</button>
        <nav class="nav" id="mainNav">${navHtml}</nav>
        ${menu}
      </div>`;

    const burger = document.getElementById('burgerBtn');
    const nav = document.getElementById('mainNav');
    if (burger) burger.addEventListener('click', () => nav.classList.toggle('open'));

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = '/index.html';
    });
  }

  function renderFooter() {
    const where = currentPage().startsWith('admin') ? '/' : '';
    document.getElementById('footer').innerHTML = `
      <div class="footer-inner">
        <div>
          <h3>Ритуальная служба</h3>
          <p class="text-sm">Организация и сопровождение заказов ритуальных услуг — качественно, этично и в срок.</p>
        </div>
        <div>
          <h3>Разделы</h3>
          <a href="${where}index.html">Главная</a>
          <a href="${where}services.html">Услуги</a>
          <a href="${where}calculator.html">Рассчитать стоимость</a>
          <a href="${where}order.html">Оформить заявку</a>
          <a href="${where}cemetery.html">Карта кладбища</a>
          <a href="${where}burial-search.html">Поиск захоронений</a>
        </div>
        <div>
          <h3>Клиентам</h3>
          <a href="${where}orders.html">Мои заказы</a>
          <a href="${where}documents.html">Документы</a>
          <a href="${where}messages.html">Сообщения</a>
          <a href="${where}notifications.html">Уведомления</a>
          <a href="${where}profile.html">Личный кабинет</a>
        </div>
        <div>
          <h3>Услуги</h3>
          <a href="${where}services.html">Каталог услуг и товаров</a>
          <a href="${where}calculator.html">Рассчитать стоимость</a>
          <a href="${where}order.html">Оформить заявку</a>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Ритуальная служба. ООО «Мемориал». Все права защищены.</div>`;
  }

  async function updateNotifBadge() {
    const badge = document.getElementById('navNotifBadge');
    if (!badge || !Auth.isLoggedIn()) return;
    try {
      const data = await Api().get('/notifications/unread-count');
      const n = data.count || 0;
      if (n > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = n;
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  function showAlert(msg, type = 'success') {
    const el = document.getElementById('alertBox');
    if (!el) return;
    el.className = 'alert show alert-' + type;
    el.textContent = msg;
  }
  function hideAlert() {
    const el = document.getElementById('alertBox');
    if (el) el.className = 'alert';
  }

  function loading(btn, loadingText, originalHtml) {
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.original = originalHtml || btn.innerHTML;
    btn.innerHTML = loadingText;
  }
  function doneLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || btn.innerHTML;
  }

  function init() {
    renderHeader();
    renderFooter();
    const user = Auth.getUser();
    const role = user ? user.role : (Auth.isLoggedIn() ? 'client' : null);
    // If not logged in, ignore protected pages guard.
    if (role) updateNotifBadge();
    if (role) {
      setInterval(updateNotifBadge, 30000);
    }
    // refresh user info if logged in
    if (Auth.isLoggedIn() && currentPage() !== 'login.html' && currentPage() !== 'register.html') {
      API.get('/auth/me').then(d => localStorage.setItem('user', JSON.stringify(d.user))).catch(() => {});
    }
  }

  return { init, showAlert, hideAlert, loading, doneLoading, currentPage, navForRole, updateNotifBadge };
})();

document.addEventListener('DOMContentLoaded', () => Common.init());

// Inline helper to pick API via whatever loaded first
function Api() { return window.API; }