const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { dataFile } = require('./config');

// Thrown whenever the data file is absent or unreadable. The seed script
// creates it; the error page and /health both show the name.
class SeedMissing extends Error {
  constructor(file) {
    super(`no data at ${path.relative(process.cwd(), file) || file}; run node scripts/seed.js`);
    this.name = 'SeedMissing';
  }
}

function exists() {
  return fs.existsSync(dataFile());
}

// The whole store is one JSON document, read fresh on every call so a re-seed
// takes effect without restarting the server.
function load() {
  const file = dataFile();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) throw new SeedMissing(file);
    throw error;
  }
}

// Write to a sibling temp file and rename, so a crash never leaves half a file.
function save(data) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

// Load, let `fn` change the data, save. Returns whatever `fn` returns.
function update(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

function newId() {
  return crypto.randomBytes(4).toString('hex');
}

function findUserById(data, id) {
  return data.users.find((u) => u.id === id);
}

function findList(data, id) {
  return data.lists.find((l) => l.id === id);
}

function canView(list, user) {
  return list.ownerId === user.id || list.sharedWith.includes(user.id);
}

function unboughtCount(list) {
  return list.items.filter((item) => !item.bought).length;
}

module.exports = {
  SeedMissing,
  exists,
  load,
  save,
  update,
  newId,
  findUserById,
  findList,
  canView,
  unboughtCount,
};
