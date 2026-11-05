const Auth = (function () {
  const TOKEN_KEY = 'token';
  const USER_KEY = 'user';

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }

  function isLoggedIn() { return !!getToken(); }

  function getRole() {
    const u = getUser();
    return u ? u.role : null;
  }

  async function fetchMe() {
    const data = await API.get('/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function roleName(role) {
    const map = { client: 'Клиент', agent: 'Обработчик заказов', admin: 'Администратор' };
    return map[role] || role;
  }

  function money(n) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n || 0);
  }

  function fmtDate(dStr) {
    if (!dStr) return '—';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function fmtDateTime(dStr) {
    if (!dStr) return '—';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    setSession, getToken, getUser, isLoggedIn, getRole, fetchMe, logout,
    roleName, money, fmtDate, fmtDateTime, esc
  };
})();

window.Auth = Auth;