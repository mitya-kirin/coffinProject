document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Common.hideAlert();

    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;

    if (password !== password2) {
      Common.showAlert('Пароли не совпадают', 'error');
      return;
    }

    const btn = form.querySelector('button[type=submit]');
    Common.loading(btn, 'Регистрация...');

    try {
      const data = await API.post('/auth/register', {
        full_name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        password
      });
      Auth.setSession(data.token, data.user);
      Common.showAlert('Регистрация успешна!', 'success');
      setTimeout(() => { window.location.href = '/profile.html'; }, 700);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    } finally {
      Common.doneLoading(btn);
    }
  });
});