document.addEventListener('DOMContentLoaded', async function () {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = '/login.html?redirect=/messages.html';
    return;
  }

  const listEl = document.getElementById('msgOrderList');
  const ordersEmpty = document.getElementById('msgOrdersEmpty');
  const chatBox = document.getElementById('msgChatBox');
  const chatInput = document.getElementById('msgChatInput');
  const chatSend = document.getElementById('msgChatSend');
  const titleEl = document.getElementById('msgOrderTitle');

  let orders = [];
  let currentOrder = null;
  let timer = null;

  async function loadOrders() {
    const data = await API.get('/orders');
    orders = data.orders;
    ordersEmpty.style.display = orders.length ? 'none' : '';
    listEl.innerHTML = orders.map(o => `
      <button class="card mb-8" data-order="${o.id}" style="width:100%;text-align:left;padding:12px 14px;background:var(--gray-light);">
        <div style="font-weight:600;font-size:0.92rem;">${Auth.esc(o.order_number)}</div>
        <div class="text-sm text-muted">${Auth.esc(o.status)}</div>
      </button>`).join('');
  }

  async function loadChat() {
    if (!currentOrder) return;
    try {
      const data = await API.get('/messages?order_id=' + currentOrder.id);
      chatBox.innerHTML = data.messages.length ? data.messages.map(m => {
        const mine = Number(m.sender_id) === Number(user.id);
        return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}">
          <div>${Auth.esc(m.message)}</div>
          <div class="chat-meta">${Auth.esc(m.sender_name || '')} · ${Auth.fmtDateTime(m.created_at)}</div>
        </div>`;
      }).join('') : `<div class="empty-state" style="padding:20px;"><p class="text-sm">Сообщений пока нет</p></div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
      API.patch('/messages/read-all?order_id=' + currentOrder.id, {}).catch(() => {});
    } catch (err) { /* ignore */ }
  }

  async function selectOrder(order) {
    currentOrder = order;
    titleEl.textContent = 'Переписка — ' + order.order_number;
    if (timer) clearInterval(timer);
    await loadChat();
    timer = setInterval(loadChat, 8000);
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-order]');
    if (!btn) return;
    const order = orders.find(o => o.id === Number(btn.dataset.order));
    if (order) await selectOrder(order);
  });

  async function send() {
    if (!currentOrder) { Common.showAlert('Выберите заказ', 'error'); return; }
    const text = chatInput.value.trim();
    if (!text) return;
    let receiver = null;
    if (user.role === 'client') receiver = currentOrder.agent_id;
    else receiver = currentOrder.client_id;
    try {
      await API.post('/messages', { order_id: currentOrder.id, receiver_id: receiver, message: text });
      chatInput.value = '';
      loadChat();
    } catch (err) { Common.showAlert(err.message, 'error'); }
  }

  chatSend.addEventListener('click', send);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  try {
    await loadOrders();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }
  window.addEventListener('beforeunload', () => { if (timer) clearInterval(timer); });
});