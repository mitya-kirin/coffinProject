const bcrypt = require('bcryptjs');
const { initDatabase, all, get, run, persist } = require('./config/database');

async function seed() {
  await initDatabase();

  // Ensure roles exist
  const roles = all('SELECT * FROM roles');
  const roleId = (name) => get('SELECT id FROM roles WHERE name = ?', [name]).id;

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const agentPassword = bcrypt.hashSync('agent123', 10);
  const clientPassword = bcrypt.hashSync('client123', 10);

  if (!get('SELECT id FROM users WHERE email = ?', ['admin@ritual.ru'])) {
    run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address) VALUES (?, ?, ?, ?, ?, ?)',
      [roleId('admin'), 'Администратор Системы', 'admin@ritual.ru', '+7 (900) 000-00-01', adminPassword, 'г. Москва']);
  }
  if (!get('SELECT id FROM users WHERE email = ?', ['agent@ritual.ru'])) {
    run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address, work_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [roleId('agent'), 'Анна Петрова', 'agent@ritual.ru', '+7 (900) 000-00-02', agentPassword, 'г. Москва', 'Пн-Пт 9:00-18:00']);
  }
  if (!get('SELECT id FROM users WHERE email = ?', ['agent2@ritual.ru'])) {
    run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address, work_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [roleId('agent'), 'Иван Сидоров', 'agent2@ritual.ru', '+7 (900) 000-00-03', agentPassword, 'г. Москва', 'Пн-Сб 8:00-20:00']);
  }
  if (!get('SELECT id FROM users WHERE email = ?', ['client@ritual.ru'])) {
    run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address) VALUES (?, ?, ?, ?, ?, ?)',
      [roleId('client'), 'Иванов Иван Иванович', 'client@ritual.ru', '+7 (900) 000-00-04', clientPassword, 'г. Москва, ул. Ленина, д. 10']);
  }
  if (!get('SELECT id FROM users WHERE email = ?', ['client2@ritual.ru'])) {
    run('INSERT INTO users (role_id, full_name, email, phone, password_hash, address) VALUES (?, ?, ?, ?, ?, ?)',
      [roleId('client'), 'Петров Пётр Петрович', 'client2@ritual.ru', '+7 (900) 000-00-05', clientPassword, 'г. Москва, ул. Садовая, д. 5']);
  }

  // Categories
  const catDefs = [
    ['Организация похорон', 'Полный комплекс услуг по организации похорон'],
    ['Транспорт', 'Транспортное сопровождение и перевозка'],
    ['Оформление документов', 'Помощь в оформлении необходимых документов'],
    ['Погребальные принадлежности', 'Гробы, венки, кресты и другие принадлежности'],
    ['Услуги по подготовке', 'Услуги по подготовке тела и санитарной обработке'],
    ['Услуги кладбища', 'Услуги по захоронению и уходу за местом'],
    ['Поминальные мероприятия', 'Организация поминальных обедов и мероприятий']
  ];
  const catIds = {};
  for (const [name, desc] of catDefs) {
    if (!get('SELECT id FROM categories WHERE name = ?', [name])) {
      run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, desc]);
    }
    catIds[name] = get('SELECT id FROM categories WHERE name = ?', [name]).id;
  }

  // Services
  const svcDefs = [
    [catIds['Организация похорон'], 'Организация похорон «Стандарт»', 'Базовый комплекс организационных услуг', 35000, 'услуга'],
    [catIds['Организация похорон'], 'Организация похорон «Премиум»', 'Расширенный комплекс с полным сопровождением', 80000, 'услуга'],
    [catIds['Транспорт'], 'Катафалк', 'Подача катафалка на кладбище', 12000, 'выезд'],
    [catIds['Транспорт'], 'Микроавтобус для родственников', 'Перевозка до 8 человек', 8000, 'выезд'],
    [catIds['Оформление документов'], 'Оформление свидетельства', 'Помощь в получении свидетельства о смерти', 5000, 'услуга'],
    [catIds['Оформление документов'], 'Оформление документов на захоронение', 'Подготовка пакета документов для кладбища', 3000, 'услуга'],
    [catIds['Погребальные принадлежности'], 'Гроб деревянный', 'Стандартный деревянный гроб', 15000, 'шт'],
    [catIds['Погребальные принадлежности'], 'Гроб лакированный', 'Лакированный гроб с обивкой', 30000, 'шт'],
    [catIds['Погребальные принадлежности'], 'Венок', 'Погребальный венок', 3500, 'шт'],
    [catIds['Услуги по подготовке'], 'Санитарная обработка', 'Полная санитарная подготовка тела', 15000, 'услуга'],
    [catIds['Услуги по подготовке'], 'Бальзамирование', 'Процедура бальзамирования', 25000, 'услуга'],
    [catIds['Услуги кладбища'], 'Копка могилы', 'Подготовка могилы на кладбище', 12000, 'услуга'],
    [catIds['Услуги кладбища'], 'Опускание гроба', 'Опускание гроба в могилу', 4000, 'услуга'],
    [catIds['Поминальные мероприятия'], 'Поминки «Стандарт»', 'Поминальный обед на 12 человек', 15000, 'мероприятие'],
    [catIds['Поминальные мероприятия'], 'Поминки «Премиум»', 'Расширенный поминальный обед', 30000, 'мероприятие']
  ];
  let svcTerminal = 0;
  for (const [cat, name, desc, price, unit] of svcDefs) {
    if (!get('SELECT id FROM services WHERE name = ?', [name])) {
      run('INSERT INTO services (category_id, name, description, price, unit, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [cat, name, desc, price, unit]);
    }
    svcTerminal++;
  }

  // Cemeteries
  if (!get('SELECT id FROM cemeteries WHERE name = ?', ['Ваганьковское кладбище'])) {
    run("INSERT INTO cemeteries (name, address, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      ['Ваганьковское кладбище', 'г. Москва, ул. Сергея Макеева, 15', 'Историческое кладбище в центре Москвы', 55.7680, 37.5540]);
  }
  const cemId = get('SELECT id FROM cemeteries WHERE name = ?', ['Ваганьковское кладбище']).id;

  // Sections + places
  const sectionNames = ['Участок 1', 'Участок 2', 'Участок 3'];
  const sectionIds = {};
  for (const sn of sectionNames) {
    if (!get('SELECT id FROM cemetery_sections WHERE name = ? AND cemetery_id = ?', [sn, cemId])) {
      run('INSERT INTO cemetery_sections (cemetery_id, name, description) VALUES (?, ?, ?)', [cemId, sn, '']);
    }
    sectionIds[sn] = get('SELECT id FROM cemetery_sections WHERE name = ? AND cemetery_id = ?', [sn, cemId]).id;
  }

  let placeIdx = 0;
  const placeStatuses = ['свободно', 'занято', 'зарезервировано', 'недоступно'];
  for (let si = 0; si < sectionNames.length; si++) {
    const sectionId = sectionIds[sectionNames[si]];
    const existingPlaces = get('SELECT COUNT(*) AS c FROM burial_places WHERE section_id = ?', [sectionId]);
    if (existingPlaces.c === 0) {
      for (let row = 1; row <= 3; row++) {
        for (let num = 1; num <= 4; num++) {
          placeIdx++;
          const status = placeStatuses[placeIdx % 4];
          run('INSERT INTO burial_places (section_id, row_number, place_number, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)',
            [sectionId, row, num, cemId * 0 + si * 0.001 + row * 0.0001, num * 0.0001, status]);
        }
      }
    }
  }

  // Burials for occupied places
  const burials = [
    ['Смирнов Алексей Петрович', '1945-05-01', '2020-11-20', sectionIds['Участок 1'], 1, 1],
    ['Кузнецова Мария Ивановна', '1938-03-15', '2018-07-14', sectionIds['Участок 1'], 1, 2],
    ['Волков Дмитрий Сергеевич', '1952-09-08', '2021-01-05', sectionIds['Участок 2'], 2, 3]
  ];
  for (const [fn, bd, dd, sectionId, row, num] of burials) {
    const place = get('SELECT bp.id FROM burial_places bp WHERE bp.section_id = ? AND bp.row_number = ? AND bp.place_number = ?', [sectionId, row, num]);
    if (place && !get('SELECT id FROM burials WHERE burial_place_id = ?', [place.id])) {
      run('INSERT INTO burials (burial_place_id, full_name, birth_date, death_date, burial_date, description) VALUES (?, ?, ?, ?, ?, ?)',
        [place.id, fn, bd, dd, dd, '']);
      run("UPDATE burial_places SET status = 'занято' WHERE id = ?", [place.id]);
    }
  }

  // Documents templates
  const docDefs = [
    ['Документ клиента', 'Паспорт или иной документ, удостоверяющий личность заявителя', 1],
    ['Свидетельство', 'Медицинское свидетельство о смерти', 1],
    ['Дополнительный документ', 'Иные документы по требованию', 0]
  ];
  for (const [name, desc, req] of docDefs) {
    if (!get('SELECT id FROM documents WHERE name = ?', [name])) {
      run('INSERT INTO documents (name, description, is_required) VALUES (?, ?, ?)', [name, desc, req]);
    }
  }

  persist();
  console.log('База данных заполнена тестовыми данными.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
