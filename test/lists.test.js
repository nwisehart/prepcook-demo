const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startPantry, listId } = require('./helpers');

let pantry;
let ben;
let ann;
before(async () => {
  pantry = await startPantry();
  ben = pantry.client();
  await ben.signIn('ben@example.com', pantry.passwords.ben);
  ann = pantry.client();
  await ann.signIn('ann@example.com', pantry.passwords.ann);
});
after(() => pantry.stop());

test('the lists page shows my lists with their unbought counts', async () => {
  const res = await ben.get('/lists');
  assert.match(res.text, /data-list-name="Weekend"/);
  assert.match(res.text, /Weekend<\/a>\s*<span class="count" data-testid="list-unbought-count">3 to buy/);
});

test('creating a list opens it', async () => {
  const res = await ben.post('/lists', { name: 'Barbecue' });
  assert.equal(res.status, 302);
  const id = listId(pantry.readData(), 'Barbecue');
  assert.equal(res.location, `/lists/${id}`);
  const page = await ben.get(res.location);
  assert.match(page.text, /data-testid="list-name">Barbecue</);
  assert.match(page.text, /data-testid="unbought-count">0 to buy/);
});

test('a blank list name creates nothing', async () => {
  const before = pantry.readData().lists.length;
  await ben.post('/lists', { name: '   ' });
  assert.equal(pantry.readData().lists.length, before);
});

test('the owner can rename a list', async () => {
  await ben.post('/lists', { name: 'Picnic' });
  const id = listId(pantry.readData(), 'Picnic');
  const res = await ben.post(`/lists/${id}/rename`, { name: 'Beach picnic' });
  assert.equal(res.location, `/lists/${id}`);
  const page = await ben.get(`/lists/${id}`);
  assert.match(page.text, /data-testid="list-name">Beach picnic</);
});

test('the owner can delete a list', async () => {
  await ben.post('/lists', { name: 'Scratch' });
  const id = listId(pantry.readData(), 'Scratch');
  const res = await ben.post(`/lists/${id}/delete`);
  assert.equal(res.location, '/lists');
  assert.equal((await ben.get(`/lists/${id}`)).status, 404);
});

test("someone else's list is not found", async () => {
  const id = listId(pantry.readData(), 'Weekend');
  assert.equal((await ann.get(`/lists/${id}`)).status, 404);
  assert.equal((await ann.post(`/lists/${id}/rename`, { name: 'Mine now' })).status, 404);
  assert.equal((await ann.post(`/lists/${id}/delete`)).status, 404);
  assert.ok(pantry.readData().lists.some((l) => l.name === 'Weekend'));
});

test('a list shared with me can be opened but not renamed or deleted', async () => {
  const id = listId(pantry.readData(), 'Household');
  const page = await ben.get(`/lists/${id}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Shared with you by Ann/);
  assert.doesNotMatch(page.text, /id="rename-list-form"/);
  assert.equal((await ben.post(`/lists/${id}/rename`, { name: 'Ours' })).status, 404);
  assert.equal((await ben.post(`/lists/${id}/delete`)).status, 404);
});
