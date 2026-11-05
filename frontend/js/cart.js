const Cart = (function () {
  const KEY = 'cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }

  function save(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }

  function add(service) {
    const cart = load();
    const existing = cart.find(i => Number(i.service_id) === Number(service.id));
    if (existing) existing.quantity += 1;
    else cart.push({ service_id: service.id, quantity: 1, price: Number(service.price) || 0, name: service.name });
    save(cart);
    return cart;
  }

  function setQty(serviceId, qty) {
    const cart = load();
    const item = cart.find(i => Number(i.service_id) === Number(serviceId));
    if (item) {
      const n = Math.max(0, Number(qty) || 0);
      if (n === 0) return remove(serviceId);
      item.quantity = n;
      save(cart);
    }
    return cart;
  }

  function remove(serviceId) {
    let cart = load();
    cart = cart.filter(i => Number(i.service_id) !== Number(serviceId));
    save(cart);
    return cart;
  }

  function clear() { save([]); return []; }

  function total(cart) {
    return (cart || load()).reduce((sum, i) => sum + Number(i.price) * Number(i.quantity || 1), 0);
  }

  function count(cart) {
    return (cart || load()).reduce((sum, i) => sum + Number(i.quantity || 1), 0);
  }

  return { load, save, add, setQty, remove, clear, total, count };
})();
window.Cart = Cart;