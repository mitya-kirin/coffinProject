document.addEventListener('DOMContentLoaded', async function () {
  const select = document.getElementById('cemeterySelect');
  const mapEl = document.getElementById('cemeteryMap');
  const infoEl = document.getElementById('placeInfo');

  let cemeteries = [];
  let current = null;
  let selectedPlace = null;

  const STATUS_LABEL = { 'свободно': 'Свободно', 'занято': 'Занято', 'зарезервировано': 'Зарезервировано', 'недоступно': 'Недоступно' };
  const STATUS_CLASS = { 'свободно': 'free', 'занято': 'occupied', 'зарезервировано': 'reserved', 'недоступно': 'unavailable' };

  async function loadCemeteries() {
    const data = await API.get('/cemeteries');
    cemeteries = data.cemeteries;
    select.innerHTML = cemeteries.map(c => `<option value="${c.id}">${Auth.esc(c.name)}</option>`).join('');
    const params = new URLSearchParams(window.location.search);
    const targetCem = params.get('cemetery');
    const targetPlace = params.get('place');
    if (cemeteries.length) {
      if (targetCem && cemeteries.find(c => String(c.id) === targetCem)) {
        select.value = targetCem;
      } else {
        select.value = cemeteries[0].id;
      }
      await loadMap(select.value);
      if (targetPlace) {
        await showPlace(Number(targetPlace));
        const el = mapEl.querySelector(`[data-place="${targetPlace}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  async function loadMap(cemId) {
    const data = await API.get('/cemeteries/' + cemId);
    current = data.cemetery;
    renderMap();
  }

  function renderMap() {
    selectedPlace = null;
    mapEl.innerHTML = `
      <div style="text-align:center;font-weight:700;color:var(--dark);margin-bottom:12px;font-size:1.05rem;">${Auth.esc(current.name)}</div>
      <div>
        ${current.sections.map(sec => `
          <div class="section-block">
            <div class="section-title-mini">${Auth.esc(sec.name)}${sec.description ? ' — ' + Auth.esc(sec.description) : ''}</div>
            ${sec.places && sec.places.length ? `<div class="place-grid">
              ${sec.places.map(p => `
                <div class="place ${STATUS_CLASS[p.status] || 'free'}" data-place="${p.id}" title="${Auth.esc(STATUS_LABEL[p.status] || p.status)} — ряд ${p.row_number || '-'} №${p.place_number || '-'}">
                  ${p.place_number || p.id}
                </div>`).join('')}
            </div>` : '<p class="text-sm text-muted">Мест нет</p>'}
          </div>`).join('')}
      </div>`;

    mapEl.querySelectorAll('[data-place]').forEach(pEl => {
      pEl.addEventListener('click', () => showPlace(Number(pEl.dataset.place)));
    });
    bindMapClick();
  }

  async function showPlace(placeId) {
    try {
      const data = await API.get('/burial-places/' + placeId);
      const p = data.place;
      selectedPlace = p;

      mapEl.querySelectorAll('.place.selected').forEach(el => el.classList.remove('selected'));
      const el = mapEl.querySelector(`[data-place="${placeId}"]`);
      if (el) el.classList.add('selected');

      const burial = p.burial;
      infoEl.innerHTML = `
        <div class="mb-16">
          <span class="badge ${p.status === 'свободно' ? 'badge-green' : p.status === 'занято' ? 'badge-red' : p.status === 'зарезервировано' ? 'badge-yellow' : 'badge-gray'}">${Auth.esc(STATUS_LABEL[p.status] || p.status)}</span>
        </div>
        <div class="info-item mb-8"><div class="info-label">Кладбище</div><div class="info-value">${Auth.esc(p.cemetery_name || '')}</div></div>
        <div class="info-item mb-8"><div class="info-label">Участок</div><div class="info-value">${Auth.esc(p.section_name || '')}</div></div>
        <div class="info-item mb-8"><div class="info-label">Ряд</div><div class="info-value">${p.row_number || '—'}</div></div>
        <div class="info-item mb-8"><div class="info-label">Номер места</div><div class="info-value">${p.place_number || '—'}</div></div>
        <div class="info-item"><div class="info-label">Координаты</div><div class="info-value">${p.latitude !== null ? p.latitude.toFixed(5) + ', ' + p.longitude.toFixed(5) : '—'}</div></div>
        <hr class="divider">
        ${burial ? `
          <h4 class="mb-8">Захоронение</h4>
          <div class="info-item mb-8"><div class="info-label">ФИО</div><div class="info-value">${Auth.esc(burial.full_name)}</div></div>
          <div class="info-item mb-8"><div class="info-label">Даты жизни</div><div class="info-value">${Auth.fmtDate(burial.birth_date)} — ${Auth.fmtDate(burial.death_date)}</div></div>
          <div class="info-item"><div class="info-label">Дата захоронения</div><div class="info-value">${Auth.fmtDate(burial.burial_date)}</div></div>
          ${burial.description ? `<p class="text-sm text-muted mt-8">${Auth.esc(burial.description)}</p>` : ''}
        ` : '<p class="text-sm text-muted">Свободное место. Захоронений нет.</p>'}
        ${userCanManage() ? `
          <hr class="divider">
          <label class="form-label">Статус места</label>
          <select class="form-control" id="placeStatusSelect">
            ${Object.keys(STATUS_LABEL).map(s => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm btn-block mt-8" id="updatePlaceStatusBtn">Сохранить статус</button>` : ''}`;

      const updBtn = document.getElementById('updatePlaceStatusBtn');
      if (updBtn) {
        updBtn.addEventListener('click', async () => {
          const status = document.getElementById('placeStatusSelect').value;
          try {
            await API.put('/burial-places/' + placeId, { status });
            Common.showAlert('Статус места обновлён', 'success');
            await loadMap(current.id);
          } catch (err) { Common.showAlert(err.message, 'error'); }
        });
      }
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  function userCanManage() {
    const u = Auth.getUser();
    return u && ['agent', 'admin'].includes(u.role);
  }

  function bindMapClick() {
    const layout = document.getElementById('cemeteryMap');
    if (!layout) return;
  }

  select.addEventListener('change', () => loadMap(select.value));

  try {
    await loadCemeteries();
  } catch (err) {
    Common.showAlert(err.message, 'error');
  }
});