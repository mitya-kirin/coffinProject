document.addEventListener('DOMContentLoaded', async function () {
  const catGrid = document.getElementById('homeCategories');
  const stepsGrid = document.getElementById('stepsGrid');
  const servicesGrid = document.getElementById('homeServices');

  const SVC_ICONS = { '🏺': ['Организация похорон', 'Транспорт', 'Оформление документов'],
                      '🕯️': ['Погребальные принадлежности', 'Поминальные мероприятия'],
                      '🏛️': ['Услуги кладбища'],
                      '🛡️': ['Услуги по подготовке'] };

  try {
    const [catData, svcData] = await Promise.all([API.get('/categories'), API.get('/services?active=true')]);
    const cats = catData.categories;
    const services = svcData.services;

    if (servicesGrid) {
      const show = services.slice(0, 6);
      servicesGrid.innerHTML = show.map(s => `
        <div class="card">
          <div class="card-body">
            <div class="badge badge-blue" style="align-self:flex-start;">${Auth.esc(s.category_name || 'Услуга')}</div>
            <div class="card-title">${Auth.esc(s.name)}</div>
            <div class="card-desc">${Auth.esc(s.description || '')}</div>
            <div class="card-footer">
              <span class="card-price">${Auth.money(s.price)}</span>
              <span class="text-sm text-muted">/ ${Auth.esc(s.unit || 'услуга')}</span>
            </div>
            <a class="btn btn-primary btn-sm mt-8" href="services.html?category=${s.category_id}" style="width:100%;text-align:center;">Подробнее</a>
          </div>
        </div>`).join('');
    }

    const iconKeys = Object.keys(SVC_ICONS);
    catGrid.innerHTML = cats.map((c, i) => {
      let icon = iconKeys[i % iconKeys.length];
      for (const [ic, names] of Object.entries(SVC_ICONS)) {
        if (names.includes(c.name)) icon = ic;
      }
      return `
      <div class="card">
        <div class="card-img">${icon}</div>
        <div class="card-body">
          <div class="card-title">${Auth.esc(c.name)}</div>
          <div class="card-desc">${Auth.esc(c.description || '')}</div>
          <a href="services.html?category=${c.id}" class="btn btn-outline btn-sm mt-8">Просмотреть услуги</a>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    const msg = `<div class="empty-state" style="grid-column:1/-1;"><p class="text-muted">Не удалось загрузить данные: ${Auth.esc(e.message)}</p></div>`;
    if (catGrid) catGrid.innerHTML = msg;
    if (servicesGrid) servicesGrid.innerHTML = msg;
  }

  const steps = [
    { n: '1', t: 'Выберите услуги и товары', d: 'Просмотрите каталог и выберите необходимое.' },
    { n: '2', t: 'Оформите заявку', d: 'Заполните форму онлайн-заявки — это доступно зарегистрированным пользователям.' },
    { n: '3', t: 'Прикрепите документы', d: 'Загрузите свидетельство о смерти в личном кабинете — обработчик проверит его.' },
    { n: '4', t: 'Подтверждение брони', d: 'Обработчик подтверждает бронь места на кладбище и организацию.' },
    { n: '5', t: 'Доставка и завершение', d: 'Следите за статусом заказа, доставкой и сообщениями на сайте.' }
  ];
  stepsGrid.innerHTML = steps.map(s => `
    <div class="card" style="padding:22px;">
      <div class="step-num">${s.n}</div>
      <div class="card-title">${s.t}</div>
      <div class="card-desc">${s.d}</div>
    </div>`).join('');
});
