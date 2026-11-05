document.addEventListener('DOMContentLoaded', async function () {
  const catSel = document.getElementById('orderCategory');
  const svcList = document.getElementById('orderServiceList');
  const cartEl = document.getElementById('orderCart');
  const cartEmpty = document.getElementById('orderCartEmpty');
  const subtotalEl = document.getElementById('orderSubtotal');
  const totalEl = document.getElementById('orderTotal');
  const submitBtn = document.getElementById('submitOrderBtn');
  const cemSel = document.getElementById('oCemetery');

  let services = [];

  // Guard: order requires login
  if (!Auth.isLoggedIn()) {
    const alertEl = document.getElementById('alertBox');
    alertEl.className = 'alert show alert-warning';
    alertEl.innerHTML = 'Для оформления заявки необходимо <a href="login.html?redirect=/order.html">войти</a> или <a href="register.html">зарегистрироваться</a>. Вы можете выбрать услуги и рассчитать стоимость без авторизации — расчёт уже доступен на странице «Рассчитать стоимость».';
  }

  async function loadCats() {
    const data = await API.get('/categories');
    catSel.innerHTML = '<option value="">Все категории</option>' +
      data.categories.map(c => `<option value="${c.id}">${Auth.esc(c.name)}</option>`).join('');
  }

  async function loadServices() {
    let url = '/services?active=true';
    if (catSel.value) url += '&category_id=' + catSel.value;
    const data = await API.get(url);
    services = data.services;
    svcList.innerHTML = services.map(s => `
      <div class="row-flex mb-8" style="justify-content:space-between;background:var(--gray-light);border-radius:8px;padding:10px 12px;">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:0.95rem;">${Auth.esc(s.name)}</div>
          <div class="text-sm text-muted">${Auth.money(s.price)} / ${Auth.esc(s.unit || 'услуга')}</div>
        </div>
        <button class="btn btn-primary btn-sm" data-order-add="${s.id}">Добавить</button>
      </div>`).join('');
  }

  async function loadCemeteries() {
    try {
      const data = await API.get('/cemeteries');
      cemSel.innerHTML = '<option value="">Не выбрано</option>' +
        data.cemeteries.map(c => `<option value="${c.id}">${Auth.esc(c.name)}</option>`).join('');
    } catch (e) { /* ignore */ }
  }

  svcList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-order-add]');
    if (!btn) return;
    const svc = services.find(s => s.id === Number(btn.dataset.orderAdd));
    if (svc) { Cart.add(svc); renderCart(); Common.showAlert(`«${svc.name}» добавлено`, 'success'); }
  });

  cartEl.addEventListener('click', (e) => {
    const qty = e.target.closest('[data-order-qty]');
    const del = e.target.closest('[data-order-del]');
    if (qty) { Cart.setQty(Number(qty.dataset.orderQty), Number(qty.value)); renderCart(); }
    if (del) { Cart.remove(Number(del.dataset.orderDel)); renderCart(); }
  });

  function renderCart() {
    const cart = Cart.load();
    cartEmpty.classList.toggle('hidden', cart.length > 0);
    cartEl.innerHTML = cart.map(i => `
      <div class="row-flex mb-8" style="justify-content:space-between;background:var(--gray-light);border-radius:8px;padding:10px 12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.92rem;">${Auth.esc(i.name)}</div>
          <div class="text-sm text-muted">${Auth.money(i.price)} × <input type="number" min="1" value="${i.quantity}" data-order-qty="${i.service_id}" class="qty-input" style="width:58px;padding:3px 6px;" />
          = ${Auth.money(Number(i.price) * Number(i.quantity))}</div>
        </div>
        <button class="btn btn-red btn-sm" data-order-del="${i.service_id}">Удалить</button>
      </div>`).join('');
    const total = Cart.total(cart);
    subtotalEl.textContent = Auth.money(total);
    totalEl.textContent = Auth.money(total);
  }

  function prefillFromUser() {
    const u = Auth.getUser();
    if (!u) return;
    document.getElementById('oFullName').value = u.full_name || '';
    document.getElementById('oPhone').value = u.phone || '';
    document.getElementById('oEmail').value = u.email || '';
    document.getElementById('oAddress').value = u.address || '';
  }

  submitBtn.addEventListener('click', async () => {
    Common.hideAlert();
    const cart = Cart.load();
    if (!cart.length) {
      Common.showAlert('Добавьте хотя бы одну услугу', 'error');
      return;
    }
    if (!Auth.isLoggedIn()) {
      Common.showAlert('Необходимо войти в систему для оформления заявки', 'error');
      return;
    }

    const fullName = document.getElementById('oFullName').value.trim();
    const phone = document.getElementById('oPhone').value.trim();
    const email = document.getElementById('oEmail').value.trim();

    if (!fullName || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Common.showAlert('Заполните корректно ФИО, телефон и email', 'error');
      return;
    }

    Common.loading(submitBtn, 'Отправка...');
    try {
      const body = {
        items: cart.map(i => ({ service_id: i.service_id, quantity: i.quantity })),
        comment: document.getElementById('oComment').value.trim(),
        desired_date: document.getElementById('oDate').value,
        desired_time: document.getElementById('oTime').value,
        address: document.getElementById('oAddress').value.trim(),
        need_burial: document.getElementById('oNeedBurial').value === '1',
        cemetery_id: cemSel.value ? Number(cemSel.value) : null,
        additional_info: document.getElementById('oAdditional').value.trim(),
        delivery_address: document.getElementById('oNeedDelivery').value === '1' ? document.getElementById('oDeliveryAddress').value.trim() : '',
        delivery_date: document.getElementById('oDeliveryDate').value || null
      };
      const data = await API.post('/orders', body);
      Cart.clear();
      Common.showAlert(`Заявка № ${data.order.order_number} создана! Вы будете перенаправлены к заказу.`, 'success');
      setTimeout(() => { window.location.href = '/order-details.html?id=' + data.order.id; }, 900);
    } catch (err) {
      Common.showAlert(err.message, 'error');
    } finally {
      Common.doneLoading(submitBtn);
    }
  });

  catSel.addEventListener('change', loadServices);

  try {
    await Promise.all([loadCats(), loadServices(), loadCemeteries()]);
    prefillFromUser();
    renderCart();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }
});