const API = (function () {
  const BASE = '/api';

  function token() {
    return localStorage.getItem('token') || '';
  }

  async function request(path, { method = 'GET', body = null, isForm = false } = {}) {
    const headers = {};
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) {
      options.body = isForm ? body : JSON.stringify(body);
    }

    const res = await fetch(BASE + path, options);
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    if (!res.ok) {
      if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/register')) {
        Auth.logout();
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        throw new Error('Сессия истекла');
      }
      throw new Error(data.message || 'Ошибка сервера (' + res.status + ')');
    }
    return data;
  }

  return {
    get: (p) => request(p),
    post: (p, b) => request(p, { method: 'POST', body: b }),
    put: (p, b) => request(p, { method: 'PUT', body: b }),
    patch: (p, b) => request(p, { method: 'PATCH', body: b }),
    del: (p) => request(p, { method: 'DELETE' }),
    upload: (p, formData) => request(p, { method: 'POST', body: formData, isForm: true }),
    base: BASE
  };
})();

window.API = API;