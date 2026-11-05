document.addEventListener('DOMContentLoaded', function () {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }
  const form = document.getElementById('searchForm');
  const resultsEl = document.getElementById('searchResults');
  const emptyEl = document.getElementById('searchEmpty');

  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('q')) {
    document.getElementById('sLastName').value = queryParams.get('q');
  }

  function buildParams() {
    const params = new URLSearchParams();
    const last = document.getElementById('sLastName').value.trim();
    const first = document.getElementById('sFirstName').value.trim();
    const middle = document.getElementById('sMiddleName').value.trim();
    const birth = document.getElementById('sBirth').value;
    const death = document.getElementById('sDeath').value;
    const placeNum = document.getElementById('sPlaceNum').value.trim();

    if (last) params.set('last_name', last);
    if (first) params.set('first_name', first);
    if (middle) params.set('q', middle);
    if (birth) params.set('birth_date', birth);
    if (death) params.set('death_date', death);
    if (placeNum) params.set('place_number', placeNum);
    if (!last && !first && !middle && !birth && !death && !placeNum) {
      // fallback query
      const q = document.getElementById('sLastName').value.trim();
      if (q) params.set('q', q);
    }
    return params;
  }

  async function doSearch(e) {
    if (e) e.preventDefault();
    Common.hideAlert();
    const params = buildParams();
    if (!params.toString()) {
      resultsEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    try {
      const data = await API.get('/burials/search?' + params.toString());
      const results = data.results || [];
      emptyEl.classList.add('hidden');
      if (!results.length) {
        resultsEl.innerHTML = `<div class="alert show alert-info">Ничего не найдено. Попробуйте изменить условия поиска.</div>`;
        return;
      }
      resultsEl.innerHTML = `
        <h3 class="mb-16">Найденные захоронения (${results.length})</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>ФИО</th><th>Даты жизни</th><th>Кладбище</th><th>Участок</th><th>Ряд</th><th>Место</th><th></th></tr></thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td><strong>${Auth.esc(r.full_name)}</strong></td>
                <td>${Auth.fmtDate(r.birth_date)} — ${Auth.fmtDate(r.death_date)}</td>
                <td>${Auth.esc(r.cemetery_name || '')}</td>
                <td>${Auth.esc(r.section_name || '')}</td>
                <td>${r.row_number || '—'}</td>
                <td>${r.place_number || '—'}</td>
                <td><a class="btn btn-sm btn-outline" href="cemetery.html?cemetery=${r.cemetery_id}&place=${r.burial_place_id}">Показать на карте</a></td>
              </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (err) {
      Common.showAlert(err.message, 'error');
    }
  }

  form.addEventListener('submit', doSearch);

  emptyEl.classList.remove('hidden');
  if (queryParams.get('q')) {
    emptyEl.classList.add('hidden');
    doSearch();
  }
});