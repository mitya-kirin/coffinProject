const fs = require('fs');
const p = 'C:/Users/admin/OneDrive/Desktop/coffinProject/backend/controllers/users.controller.js';
let c = fs.readFileSync(p, 'utf8');

// Fix unblockUser line with datetimdatetime typo
c = c.replace(
  "db.run('UPDATE users SET is_blocked = 0, updated_at = datetimdatetime('now') WHERE id = ?",
  "db.run('UPDATE users SET is_blocked = 0, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?', [id]);"
);

// Fix blockUser line - add missing closing paren
c = c.replace(
  "db.run('UPDATE users SET is_blocked = 1, updated_at = datetime('now') WHERE id = ?",
  "db.run('UPDATE users SET is_blocked = 1, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?', [id]);"
);

fs.writeFileSync(p, c);
console.log('Fixed both lines');
