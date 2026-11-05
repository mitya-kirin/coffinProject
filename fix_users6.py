# -*- coding: utf-8 -*-
import re

p = 'C:/Users/admin/OneDrive/Desktop/coffinProject/backend/controllers/users.controller.js'
with open(p, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 25 (index 24): blockUser is_blocked line
# Current: db.run('UPDATE users SET is_blocked = 1, updated_at = datetime('now') WHERE id = ?'
# Should be: db.run('UPDATE users SET is_blocked = 1, updated_at = datetime(' + "'" + 'now' + "') WHERE id = ?', [id]);"
lines[24] = "  db.run('UPDATE users SET is_blocked = 1, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?', [id]);\n"

# Fix line 35 (index 34): unblockUser is_blocked line
# Current: db.run('UPDATE users SET is_blocked = 0, updated_at = datetimdatetime('now') WHERE id = ?'
# Should be: db.run('UPDATE users SET is_blocked = 0, updated_at = datetime(' + "'" + 'now' + "') WHERE id = ?', [id]);"
lines[34] = "  db.run('UPDATE users SET is_blocked = 0, updated_at = datetime(' + \"'\" + 'now' + "') WHERE id = ?', [id]);\n"

with open(p, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed both lines')
