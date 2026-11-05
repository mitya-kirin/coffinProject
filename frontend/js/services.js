document.addEventListener('DOMContentLoaded', async function () {
  const grid = document.getElementById('servicesGrid');
  const emptyState = document.getElementById('emptyState');
  const tabsEl = document.getElementById('categoryTabs');
  const searchInput = document.getElementById('searchInput');
  const sortSel = document.getElementById('sortSelect');

  const state = { category: '', search: '', sort: '' };
  let categories = [];
  let services = [];

  const ICONS = ['🏺', '🕯️', '⚰️', '🚐', '📋', '🌿', '🕍'];

  async function loadCategories() {
    const data = await API.get('/categories');
    categories = data.categories;
    renderTabs();
  }

  function renderTabs() {
    tabsEl.innerHTML =
      `<button class="tab-item ${state.category === '' ? 'active' : ''}" data-cat="">Все</button>` +
      categories.map(c =>
        `<button class="tab-item ${String(state.category) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${Auth.esc(c.name)}</button>`
      ).join('');
    tabsEl.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat;
        renderTabs();
        loadServices();
      });
    });
  }

  async function loadServices() {
    const params = new URLSearchParams();
    params.set('active', 'true');
    if (state.category) params.set('category_id', state.category);
    if (state.search) params.set('search', state.search);
    if (state.sort) params.set('sort', state.sort);
    const data = await API.get('/services?' + params.toString());
    services = data.services;
    render();
  }

  function iconFor(catId) {
    return ICONS[Number(catId) % ICONS.length] || '⭐';
  }

  function render() {
    if (!services.length) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    grid.innerHTML = services.map(s => `
      <div class="card">
        <div class="card-img">${iconFor(s.category_id)}</div>
        <div class="card-body">
          <div class="badge badge-blue" style="align-self:flex-start;">${Auth.esc(s.category_name || 'Услуга')}</div>
          <div class="card-title">${Auth.esc(s.name)}</div>
          <div class="card-desc">${Auth.esc(s.description || '')}</div>
          <div class="card-footer">
            <span class="card-price">${Auth.money(s.price)}</span>
            <span class="text-sm text-muted">/ ${Auth.esc(s.unit || 'услуга')}</span>
          </div>
          <div class="row-flex mt-8">
            <button class="btn btn-primary btn-sm" data-add="${s.id}" style="flex:1;">Добавить в заявку</button>
          </div>
        </div>
      </div>`).join('');
  }

  // Share selection with calculator via localStorage
  function addToCart(serviceId) {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch (e) {}
    const existing = cart.find(i => i.service_id === svc.id);
    if (existing) existing.quantity += 1;
    else cart.push({ service_id: svc.id, quantity: 1, price: svc.price, name: svc.name });
    localStorage.setItem('cart', JSON.stringify(cart));
    Common.showAlert(`Услуга «${svc.name}» добавлена в заявку. <a href="order.html" style="color:inherit;text-decoration:underline;">Перейти к оформлению</a>`, 'success');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (btn) addToCart(Number(btn.dataset.add));
  });

  searchInput.addEventListener('input', debounce(() => { state.search = searchInput.value.trim(); loadServices(); }, 250));
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; loadServices(); });

  function debounce(fn, ms) {
    let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // category from URL
  const params = new URLSearchParams(window.location.search);
  const catFromUrl = params.get('category');

  try {
    await loadCategories();
    if (catFromUrl) {
      state.category = catFromUrl;
      renderTabs();
    }
    await loadServices();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }

  window.debounce = debounce;
});
