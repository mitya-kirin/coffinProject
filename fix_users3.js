const fs = require('fs');
const p = 'C:/Users/admin/OneDrive/Desktop/coffinProject/backend/controllers/users.controller.js';
let c = fs.readFileSync(p, 'utf8');

// Fix the corrupted line 25
c = c.replace(
  /db\.run\('UPDATE users SET is_blocked = 1, updated_at = datetimdatetime\(.*\) WHERE id = \?/,
  "db.run('UPDATE users SET is_blocked = 1, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?"
);

// Fix the corrupted line 35  
c = c.replace(
  /db\.run\('UPDATE users SET is_blocked = 0, updated_at = datetimdatetime\(.*\) WHERE id = \?/,
  "db.run('UPDATE users SET is_blocked = 0, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?"
);

fs.writeFileSync(p, c);
console.log('Fixed corrupted datetime lines');

