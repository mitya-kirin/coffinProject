document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();

  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=/profile.html';
    return;
  }

  const role = user.role;

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(tab.dataset.tab).classList.remove('hidden');
    });
  });

  // Profile form
  const form = document.getElementById('profileForm');
  document.getElementById('pFullName').value = user.full_name || '';
  document.getElementById('pPhone').value = user.phone || '';
  document.getElementById('pEmail').value = user.email || '';
  document.getElementById('pAddress').value = user.address || '';
  document.getElementById('pRole').textContent = Auth.roleName(role);
  document.getElementById('pWorkHours').textContent = user.work_hours ? 'Рабочие часы: ' + user.work_hours : '';
  document.getElementById('pCreatedAt').textContent = 'Регистрация: ' + Auth.fmtDate(user.created_at);

  // Stats
  try {
    const data = await API.get('/orders');
    const orders = data.orders;
    const active = orders.filter(o => !['Завершено', 'Отменено'].includes(o.status)).length;
    document.getElementById('pStats').innerHTML = `
      <li>Заказов всего: <strong>${orders.length}</strong></li>
      <li>Активных заказов: <strong>${active}</strong></li>`;
  } catch (e) { /* ignore */ }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Common.hideAlert();
    const btn = form.querySelector('button[type=submit]');
    Common.loading(btn, 'Сохранение...');
    try {
      const data = await API.put('/users/' + user.id, {
        full_name: document.getElementById('pFullName').value.trim(),
        phone: document.getElementById('pPhone').value.trim(),
        address: document.getElementById('pAddress').value.trim()
      });
      Auth.setSession(Auth.getToken(), data.user);
      Common.showAlert('Данные сохранены', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    } finally { Common.doneLoading(btn); }
  });

  // Password
  const pwForm = document.getElementById('passwordForm');
  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    Common.hideAlert();
    if (document.getElementById('pwNew').value !== document.getElementById('pwNew2').value) {
      Common.showAlert('Пароли не совпадают', 'error');
      return;
    }
    const btn = pwForm.querySelector('button[type=submit]');
    Common.loading(btn, 'Сохранение...');
    try {
      await API.post('/users/' + user.id + '/change-password', {
        current_password: document.getElementById('pwCurrent').value,
        new_password: document.getElementById('pwNew').value
      });
      Common.showAlert('Пароль изменён', 'success');
      pwForm.reset();
    } catch (err) {
      Common.showAlert(err.message, 'error');
    } finally { Common.doneLoading(btn); }
  });
});