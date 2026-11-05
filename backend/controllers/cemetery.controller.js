const db = require('../config/database');

function str(v) {
  return v !== undefined && v !== null ? String(v) : '';
}

// --- Cemeteries ---
function listCemeteries(req, res) {
  res.json({ cemeteries: db.all('SELECT * FROM cemeteries ORDER BY id') });
}

function getCemetery(req, res) {
  const cem = db.get('SELECT * FROM cemeteries WHERE id = ?', [req.params.id]);
  if (!cem) return res.status(404).json({ message: 'Кладбище не найдено' });
  cem.sections = db.all('SELECT * FROM cemetery_sections WHERE cemetery_id = ?', [cem.id]);
  for (const s of cem.sections) {
    s.places = db.all('SELECT * FROM burial_places WHERE section_id = ? ORDER BY row_number, place_number', [s.id]);
  }
  res.json({ cemetery: cem });
}

function createCemetery(req, res) {
  const { name, address, description, latitude, longitude } = req.body;
  if (!name) return res.status(400).json({ message: 'Укажите название кладбища' });
  db.run('INSERT INTO cemeteries (name, address, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
    [name, str(address), str(description), latitude || null, longitude || null]);
  res.status(201).json({ message: 'Кладбище добавлено', cemetery: db.get('SELECT * FROM cemeteries WHERE id = ?', [db.lastInsertId()]) });
}

function updateCemetery(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM cemeteries WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Кладбище не найдено' });
  const { name, address, description, latitude, longitude } = req.body;
  db.run('UPDATE cemeteries SET name = ?, address = ?, description = ?, latitude = ?, longitude = ? WHERE id = ?', [
    name !== undefined ? name : existing.name,
    address !== undefined ? address : existing.address,
    description !== undefined ? description : existing.description,
    latitude !== undefined ? latitude : existing.latitude,
    longitude !== undefined ? longitude : existing.longitude,
    id
  ]);
  res.json({ message: 'Кладбище обновлено', cemetery: db.get('SELECT * FROM cemeteries WHERE id = ?', [id]) });
}

function deleteCemetery(req, res) {
  db.run('DELETE FROM cemeteries WHERE id = ?', [req.params.id]);
  res.json({ message: 'Кладбище удалено' });
}

// --- Sections ---
function listSections(req, res) {
  const cemetery_id = req.query.cemetery_id;
  let sql = 'SELECT * FROM cemetery_sections';
  const params = [];
  if (cemetery_id) { sql += ' WHERE cemetery_id = ?'; params.push(cemetery_id); }
  sql += ' ORDER BY id';
  res.json({ sections: db.all(sql, params) });
}

function createSection(req, res) {
  const { cemetery_id, name, description } = req.body;
  if (!cemetery_id || !name) return res.status(400).json({ message: 'Укажите кладбище и название участка' });
  db.run('INSERT INTO cemetery_sections (cemetery_id, name, description) VALUES (?, ?, ?)', [cemetery_id, name, str(description)]);
  res.status(201).json({ message: 'Участок создан', section: db.get('SELECT * FROM cemetery_sections WHERE id = ?', [db.lastInsertId()]) });
}

function updateSection(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM cemetery_sections WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Участок не найден' });
  const { name, description } = req.body;
  db.run('UPDATE cemetery_sections SET name = ?, description = ? WHERE id = ?', [
    name !== undefined ? name : existing.name,
    description !== undefined ? description : existing.description, id]);
  res.json({ message: 'Участок обновлён', section: db.get('SELECT * FROM cemetery_sections WHERE id = ?', [id]) });
}

function deleteSection(req, res) {
  db.run('DELETE FROM cemetery_sections WHERE id = ?', [req.params.id]);
  res.json({ message: 'Участок удалён' });
}

// --- Burial places ---
function listBurialPlaces(req, res) {
  let sql = `SELECT bp.*, sec.name AS section_name, sec.cemetery_id, cem.name AS cemetery_name
             FROM burial_places bp
             JOIN cemetery_sections sec ON bp.section_id = sec.id
             JOIN cemeteries cem ON sec.cemetery_id = cem.id`;
  const where = [];
  const params = [];
  if (req.query.status) { where.push('bp.status = ?'); params.push(req.query.status); }
  if (req.query.cemetery_id) { where.push('sec.cemetery_id = ?'); params.push(req.query.cemetery_id); }
  if (req.query.section_id) { where.push('bp.section_id = ?'); params.push(req.query.section_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY bp.section_id, bp.row_number, bp.place_number';
  res.json({ places: db.all(sql, params) });
}

function getBurialPlace(req, res) {
  const place = db.get(
    `SELECT bp.*, sec.name AS section_name, sec.cemetery_id, cem.name AS cemetery_name
     FROM burial_places bp
     JOIN cemetery_sections sec ON bp.section_id = sec.id
     JOIN cemeteries cem ON sec.cemetery_id = cem.id
     WHERE bp.id = ?`, [req.params.id]);
  if (!place) return res.status(404).json({ message: 'Место не найдено' });
  place.burial = db.get('SELECT * FROM burials WHERE burial_place_id = ?', [place.id]) || null;
  res.json({ place });
}

function createBurialPlace(req, res) {
  const { section_id, row_number, place_number, latitude, longitude, status } = req.body;
  if (!section_id) return res.status(400).json({ message: 'Укажите участок' });
  db.run('INSERT INTO burial_places (section_id, row_number, place_number, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)',
    [section_id, row_number || null, place_number || null, latitude || null, longitude || null, status || 'свободно']);
  res.status(201).json({ message: 'Место добавлено', place: db.get('SELECT * FROM burial_places WHERE id = ?', [db.lastInsertId()]) });
}

function updateBurialPlace(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM burial_places WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Место не найдено' });
  const { section_id, row_number, place_number, latitude, longitude, status } = req.body;
  db.run('UPDATE burial_places SET section_id = ?, row_number = ?, place_number = ?, latitude = ?, longitude = ?, status = ? WHERE id = ?', [
    section_id !== undefined ? section_id : existing.section_id,
    row_number !== undefined ? row_number : existing.row_number,
    place_number !== undefined ? place_number : existing.place_number,
    latitude !== undefined ? latitude : existing.latitude,
    longitude !== undefined ? longitude : existing.longitude,
    status !== undefined ? status : existing.status,
    id
  ]);
  db.persist();
  res.json({ message: 'Место обновлено', place: db.get('SELECT * FROM burial_places WHERE id = ?', [id]) });
}

// --- Burials ---
function listBurials(req, res) {
  res.json({ burials: db.all(`SELECT b.*, bp.section_id, bp.row_number, bp.place_number, sec.name AS section_name, sec.cemetery_id, cem.name AS cemetery_name
     FROM burials b JOIN burial_places bp ON b.burial_place_id = bp.id
     JOIN cemetery_sections sec ON bp.section_id = sec.id
     JOIN cemeteries cem ON sec.cemetery_id = cem.id ORDER BY b.id DESC`) });
}

function searchBurials(req, res) {
  const q = (req.query.q || '').trim();
  let cond = '1=1';
  const params = [];
  if (q) {
    cond = '(b.full_name LIKE ? OR b.birth_date LIKE ? OR b.death_date LIKE ?)';
    const like = '%' + q + '%';
    params.push(like, like, like);
  }
  if (req.query.first_name) { cond += ' AND b.full_name LIKE ?'; params.push('%' + req.query.first_name + '%'); }
  if (req.query.last_name) { cond += ' AND b.full_name LIKE ?'; params.push('%' + req.query.last_name + '%'); }
  if (req.query.birth_date) { cond += ' AND b.birth_date = ?'; params.push(req.query.birth_date); }
  if (req.query.death_date) { cond += ' AND b.death_date = ?'; params.push(req.query.death_date); }
  if (req.query.place_number) { cond += ' AND bp.place_number = ?'; params.push(req.query.place_number); }
  if (req.query.section_name) { cond += ' AND sec.name = ?'; params.push(req.query.section_name); }

  const results = db.all(
    `SELECT b.*, bp.id AS burial_place_id, bp.section_id, bp.row_number, bp.place_number, bp.latitude, bp.longitude,
            sec.name AS section_name, cem.id AS cemetery_id, cem.name AS cemetery_name
     FROM burials b
     JOIN burial_places bp ON b.burial_place_id = bp.id
     JOIN cemetery_sections sec ON bp.section_id = sec.id
     JOIN cemeteries cem ON sec.cemetery_id = cem.id
     WHERE ${cond} ORDER BY b.full_name`, params);
  res.json({ results });
}

function createBurial(req, res) {
  const { burial_place_id, full_name, birth_date, death_date, burial_date, description } = req.body;
  if (!burial_place_id || !full_name) return res.status(400).json({ message: 'Укажите место и ФИО' });
  db.run('INSERT INTO burials (burial_place_id, full_name, birth_date, death_date, burial_date, description) VALUES (?, ?, ?, ?, ?, ?)',
    [burial_place_id, full_name, birth_date || null, death_date || null, burial_date || null, str(description)]);
  db.run('UPDATE burial_places SET status = ? WHERE id = ?', ['занято', burial_place_id]);
  db.persist();
  res.status(201).json({ message: 'Захоронение добавлено', burial: db.get('SELECT * FROM burials WHERE id = ?', [db.lastInsertId()]) });
}

function updateBurial(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM burials WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Захоронение не найдено' });
  const { full_name, birth_date, death_date, burial_date, description } = req.body;
  db.run('UPDATE burials SET full_name = ?, birth_date = ?, death_date = ?, burial_date = ?, description = ? WHERE id = ?', [
    full_name !== undefined ? full_name : existing.full_name,
    birth_date !== undefined ? birth_date : existing.birth_date,
    death_date !== undefined ? death_date : existing.death_date,
    burial_date !== undefined ? burial_date : existing.burial_date,
    description !== undefined ? description : existing.description,
    id
  ]);
  db.persist();
  res.json({ message: 'Захоронение обновлено', burial: db.get('SELECT * FROM burials WHERE id = ?', [id]) });
}

function deleteBurial(req, res) {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM burials WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Захоронение не найдено' });
  db.run('UPDATE burial_places SET status = ? WHERE id = ?', ['свободно', existing.burial_place_id]);
  db.run('DELETE FROM burials WHERE id = ?', [id]);
  db.persist();
  res.json({ message: 'Захоронение удалено' });
}

module.exports = {
  listCemeteries, getCemetery, createCemetery, updateCemetery, deleteCemetery,
  listSections, createSection, updateSection, deleteSection,
  listBurialPlaces, getBurialPlace, createBurialPlace, updateBurialPlace,
  listBurials, searchBurials, createBurial, updateBurial, deleteBurial
};
