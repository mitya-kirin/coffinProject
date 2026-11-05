document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');

  // If already logged in, go to cabinet
  if (Auth.isLoggedIn()) {
    const u = Auth.getUser();
    if (u && u.role === 'admin') window.location.href = '/admin/index.html';
    else if (u && u.role === 'agent') window.location.href = '/orders.html';
    else window.location.href = '/profile.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Common.hideAlert();
    const btn = form.querySelector('button[type=submit]');
    Common.loading(btn, 'Вход...');

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await API.post('/auth/login', { email, password });
      Auth.setSession(data.token, data.user);
      Common.showAlert('Вход выполнен успешно!', 'success');

      const params = new URLSearchParams(window.location.search);
      let redirect = params.get('redirect');
      if (!redirect) {
        if (data.user.role === 'admin') redirect = '/admin/index.html';
        else if (data.user.role === 'agent') redirect = '/orders.html';
        else redirect = '/profile.html';
      }
      setTimeout(() => { window.location.href = redirect; }, 600);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    } finally {
      Common.doneLoading(btn);
    }
  });
});