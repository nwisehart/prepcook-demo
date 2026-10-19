const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startPantry, listId } = require('./helpers');

let pantry;
let ben;
let id;
before(async () => {
  pantry = await startPantry();
  ben = pantry.client();
  await ben.signIn('ben@example.com', pantry.passwords.ben);
  const res = await ben.post('/lists', { name: 'Groceries' });
  id = res.location.split('/').pop();
});
after(() => pantry.stop());

const list = () => pantry.readData().lists.find((l) => l.id === id);
const count = async () => (await ben.get(`/lists/${id}`)).text.match(/data-testid="unbought-count">(\d+) to buy/)[1];

test('adding an item stores its name and quantity', async () => {
  const res = await ben.post(`/lists/${id}/items`, { name: 'Apples', quantity: '4' });
  assert.equal(res.location, `/lists/${id}`);
  const apples = list().items.find((i) => i.name === 'Apples');
  assert.equal(apples.quantity, 4);
  assert.equal(apples.bought, false);
  const page = await ben.get(`/lists/${id}`);
  assert.match(page.text, /data-item-name="Apples"/);
  assert.equal(await count(), '1');
});

test('a missing or silly quantity becomes 1', async () => {
  await ben.post(`/lists/${id}/items`, { name: 'Milk', quantity: '' });
  await ben.post(`/lists/${id}/items`, { name: 'Bread', quantity: '-3' });
  const items = list().items;
  assert.equal(items.find((i) => i.name === 'Milk').quantity, 1);
  assert.equal(items.find((i) => i.name === 'Bread').quantity, 1);
  assert.equal(await count(), '3');
});

test('ticking an item as bought lowers the count, unticking raises it', async () => {
  const milk = list().items.find((i) => i.name === 'Milk');
  await ben.post(`/lists/${id}/items/${milk.id}/toggle`);
  assert.equal(list().items.find((i) => i.id === milk.id).bought, true);
  assert.equal(await count(), '2');
  await ben.post(`/lists/${id}/items/${milk.id}/toggle`);
  assert.equal(await count(), '3');
});

test('deleting an item removes it', async () => {
  const bread = list().items.find((i) => i.name === 'Bread');
  await ben.post(`/lists/${id}/items/${bread.id}/delete`);
  assert.ok(!list().items.some((i) => i.id === bread.id));
  assert.equal(await count(), '2');
});

test('item names are escaped in the page', async () => {
  await ben.post(`/lists/${id}/items`, { name: '<b>Cheese</b>', quantity: '1' });
  const page = await ben.get(`/lists/${id}`);
  assert.match(page.text, /&lt;b&gt;Cheese&lt;\/b&gt;/);
  assert.doesNotMatch(page.text, /<b>Cheese<\/b>/);
});

test('someone the list is shared with can add and tick items', async () => {
  const household = listId(pantry.readData(), 'Household');
  await ben.post(`/lists/${household}/items`, { name: 'Sponges', quantity: '3' });
  const data = pantry.readData();
  const sponges = data.lists.find((l) => l.id === household).items.find((i) => i.name === 'Sponges');
  assert.equal(sponges.quantity, 3);
  await ben.post(`/lists/${household}/items/${sponges.id}/toggle`);
  const after = pantry.readData().lists.find((l) => l.id === household).items.find((i) => i.id === sponges.id);
  assert.equal(after.bought, true);
});

test('items on a list I cannot see are left alone', async () => {
  const ann = pantry.client();
  await ann.signIn('ann@example.com', pantry.passwords.ann);
  const apples = list().items.find((i) => i.name === 'Apples');
  assert.equal((await ann.post(`/lists/${id}/items`, { name: 'Sneaky' })).status, 404);
  assert.equal((await ann.post(`/lists/${id}/items/${apples.id}/delete`)).status, 404);
  assert.ok(list().items.some((i) => i.id === apples.id));
});
