document.addEventListener('DOMContentLoaded', async function () {
  const catSel = document.getElementById('calcCategory');
  const listEl = document.getElementById('calcServiceList');
  const emptyEl = document.getElementById('calcEmpty');
  const cartEl = document.getElementById('calcCart');
  const cartEmpty = document.getElementById('calcCartEmpty');
  const subtotalEl = document.getElementById('calcSubtotal');
  const totalEl = document.getElementById('calcTotal');
  const countEl = document.getElementById('calcCount');

  let services = [];

  async function loadCategories() {
    const data = await API.get('/categories');
    catSel.innerHTML = '<option value="">Все категории</option>' +
      data.categories.map(c => `<option value="${c.id}">${Auth.esc(c.name)}</option>`).join('');
  }

  async function loadServices() {
    let url = '/services?active=true';
    if (catSel.value) url += '&category_id=' + catSel.value;
    const data = await API.get(url);
    services = data.services;
    listEl.innerHTML = services.map(s => `
      <div class="card mb-16" style="padding:16px;">
        <div class="row-flex" style="justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div class="card-title">${Auth.esc(s.name)}</div>
            <div class="text-sm text-muted">${Auth.money(s.price)} / ${Auth.esc(s.unit || 'услуга')}</div>
          </div>
          <button class="btn btn-primary btn-sm" data-calc-add="${s.id}">+ Добавить</button>
        </div>
      </div>`).join('');
    emptyEl.classList.toggle('hidden', services.length > 0);
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-calc-add]');
    if (!btn) return;
    const svc = services.find(s => s.id === Number(btn.dataset.calcAdd));
    if (svc) { Cart.add(svc); renderCart(); Common.showAlert(`«${svc.name}» добавлено`, 'success'); }
  });

  cartEl.addEventListener('click', (e) => {
    const qty = e.target.closest('[data-calc-qty]');
    const del = e.target.closest('[data-calc-del]');
    if (qty) { Cart.setQty(Number(qty.dataset.calcQty), Number(qty.value)); renderCart(); }
    if (del) { Cart.remove(Number(del.dataset.calcDel)); renderCart(); }
  });

  function renderCart() {
    const cart = Cart.load();
    cartEmpty.style.display = cart.length ? 'none' : '';
    cartEl.innerHTML = cart.map(i => `
      <div class="row-flex mb-8" style="justify-content:space-between;background:var(--gray-light);border-radius:8px;padding:10px 12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Auth.esc(i.name)}</div>
          <div class="text-sm text-muted">${Auth.money(i.price)} × <input type="number" min="1" value="${i.quantity}" data-calc-qty="${i.service_id}" class="qty-input form-control" style="display:inline-block;width:60px;padding:4px 6px;height:auto;" />
          = ${Auth.money(Number(i.price) * Number(i.quantity))}
          <button class="btn btn-red btn-sm" data-calc-del="${i.service_id}" style="padding:4px 10px;min-height:26px;font-size:0.8rem;">Удалить</button></div>
        </div>
      </div>`).join('');
    const total = Cart.total(cart);
    subtotalEl.textContent = Auth.money(total);
    totalEl.textContent = Auth.money(total);
    countEl.textContent = Cart.count(cart);
  }

  catSel.addEventListener('change', loadServices);

  try {
    await loadCategories();
    await loadServices();
    renderCart();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }
});