// Creates the data file from scratch: two users with fresh random passwords,
// Ben's "Weekend" list, and Ann's "Household" list shared with Ben.
//
// The test login is appended to $PREPCOOK_ENV_OUT as KEY=VALUE lines (or
// written to data/seed.env when that is unset). Nothing secret is printed.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const store = require('../src/store');
const { hashPassword } = require('../src/auth');
const { root, dataFile } = require('../src/config');

function user(name, email, password) {
  const { salt, hash } = hashPassword(password);
  return { id: store.newId(), name, email, salt, passwordHash: hash };
}

function item(name, quantity, bought = false) {
  return { id: store.newId(), name, quantity, bought };
}

function seed() {
  const passwords = {
    ann: crypto.randomBytes(12).toString('base64url'),
    ben: crypto.randomBytes(12).toString('base64url'),
  };
  const ann = user('Ann', 'ann@example.com', passwords.ann);
  const ben = user('Ben', 'ben@example.com', passwords.ben);
  const data = {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    users: [ann, ben],
    lists: [
      {
        id: store.newId(),
        ownerId: ben.id,
        name: 'Weekend',
        sharedWith: [],
        items: [item('Eggs', 12), item('Sourdough loaf', 1), item('Tomatoes', 6), item('Coffee beans', 1, true)],
      },
      {
        id: store.newId(),
        ownerId: ann.id,
        name: 'Household',
        sharedWith: [ben.id],
        items: [item('Dish soap', 1), item('Paper towels', 2)],
      },
    ],
  };
  fs.rmSync(dataFile(), { force: true });
  store.save(data);
  return { data, passwords };
}

function main() {
  const { passwords } = seed();
  const lines = [
    'PREPCOOK_TEST_USER_EMAIL=ben@example.com',
    `PREPCOOK_TEST_USER_PASSWORD=${passwords.ben}`,
    'PREPCOOK_SEED_OTHER_USER_EMAIL=ann@example.com',
  ];
  const content = `${lines.join('\n')}\n`;
  let out = process.env.PREPCOOK_ENV_OUT;
  if (out) {
    fs.appendFileSync(out, content, { mode: 0o600 });
  } else {
    out = path.join(root, 'data', 'seed.env');
    fs.writeFileSync(out, content, { mode: 0o600 });
  }
  console.log(`Seeded ${path.relative(process.cwd(), dataFile()) || dataFile()}: users ann@example.com, ben@example.com; lists "Weekend" (Ben) and "Household" (Ann, shared with Ben).`);
  console.log(`Test login (ben@example.com) written to ${out}.`);
}

if (require.main === module) main();

module.exports = { seed };
