const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { startPantry } = require('./helpers');

let pantry;
before(async () => {
  pantry = await startPantry();
});
after(() => pantry.stop());

test('health reports ok when the data file exists', async () => {
  const res = await pantry.client().get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.text), { status: 'ok' });
});

test('signed-out visitors are sent to the sign-in page', async () => {
  const res = await pantry.client().get('/lists');
  assert.equal(res.status, 302);
  assert.equal(res.location, '/login');
});

test('sign-in with the right password opens the lists page', async () => {
  const ben = pantry.client();
  const res = await ben.post('/login', { email: 'ben@example.com', password: pantry.passwords.ben });
  assert.equal(res.status, 302);
  assert.equal(res.location, '/lists');
  const lists = await ben.get('/lists');
  assert.equal(lists.status, 200);
  assert.match(lists.text, /data-testid="current-user">ben@example\.com</);
});

test('sign-in ignores the case of the email and surrounding spaces', async () => {
  const res = await pantry.client().post('/login', { email: '  Ben@Example.COM ', password: pantry.passwords.ben });
  assert.equal(res.status, 302);
});

test('sign-in with the wrong password is refused', async () => {
  const res = await pantry.client().post('/login', { email: 'ben@example.com', password: 'not-it' });
  assert.equal(res.status, 401);
  assert.match(res.text, /Wrong email or password/);
});

test('sign-in with an unknown email is refused', async () => {
  const res = await pantry.client().post('/login', { email: 'cy@example.com', password: 'whatever' });
  assert.equal(res.status, 401);
});

test('a forged session cookie is ignored', async () => {
  const data = pantry.readData();
  const client = pantry.client();
  client.cookie = `pantry_session=${data.users[0].id}.forged`;
  const res = await client.get('/lists');
  assert.equal(res.location, '/login');
});

test('sign-out ends the session', async () => {
  const ben = pantry.client();
  await ben.signIn('ben@example.com', pantry.passwords.ben);
  const out = await ben.post('/logout');
  assert.equal(out.location, '/login');
  const res = await ben.get('/lists');
  assert.equal(res.location, '/login');
});

test('without a data file, health and pages say SeedMissing', async () => {
  const saved = fs.readFileSync(pantry.dataFile);
  fs.rmSync(pantry.dataFile);
  try {
    const health = await pantry.client().get('/health');
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.text).status, 'SeedMissing');
    const page = await pantry.client().get('/login');
    assert.equal(page.status, 503);
    assert.match(page.text, /SeedMissing/);
  } finally {
    fs.writeFileSync(pantry.dataFile, saved);
  }
});

test('every request is logged as one JSON line without the password', async () => {
  await pantry.client().post('/login', { email: 'ben@example.com', password: pantry.passwords.ben });
  const lines = fs.readFileSync(process.env.PANTRY_LOG_FILE, 'utf8').trim().split('\n');
  const last = JSON.parse(lines.at(-1));
  assert.equal(last.method, 'POST');
  assert.equal(last.path, '/login');
  assert.equal(last.status, 302);
  assert.ok(!lines.join('\n').includes(pantry.passwords.ben));
});
