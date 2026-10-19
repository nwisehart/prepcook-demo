const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startPantry, listId } = require('./helpers');

let pantry;
let ben;
let ann;
let weekend;
before(async () => {
  pantry = await startPantry();
  ben = pantry.client();
  await ben.signIn('ben@example.com', pantry.passwords.ben);
  ann = pantry.client();
  await ann.signIn('ann@example.com', pantry.passwords.ann);
  weekend = listId(pantry.readData(), 'Weekend');
});
after(() => pantry.stop());

test('a list starts out under "Shared with me" only for the people it is shared with', async () => {
  const benLists = await ben.get('/lists');
  assert.match(benLists.text, /id="shared-with-me"[\s\S]*data-list-name="Household"/);
  const annLists = await ann.get('/lists');
  assert.doesNotMatch(annLists.text, /data-list-name="Weekend"/);
});

test('sharing a list by email shows it to that user under "Shared with me"', async () => {
  const res = await ben.post(`/lists/${weekend}/share`, { email: 'ann@example.com' });
  assert.equal(res.status, 302);
  const page = await ben.get(res.location);
  assert.match(page.text, /data-testid="flash"[^>]*>Shared with ann@example\.com\.</);
  assert.match(page.text, /data-testid="shared-with-user">Ann \(ann@example\.com\)</);

  const annLists = await ann.get('/lists');
  assert.match(annLists.text, /id="shared-with-me"[\s\S]*data-list-name="Weekend"/);
  assert.equal((await ann.get(`/lists/${weekend}`)).status, 200);
});

test('sharing again with the same person still succeeds', async () => {
  const res = await ben.post(`/lists/${weekend}/share`, { email: 'ann@example.com' });
  assert.equal(res.status, 302);
  const list = pantry.readData().lists.find((l) => l.id === weekend);
  assert.equal(list.sharedWith.length, 1);
});

test('sharing with an email nobody has is refused', async () => {
  const res = await ben.post(`/lists/${weekend}/share`, { email: 'cy@example.com' });
  assert.equal(res.status, 404);
  assert.match(res.text, /data-testid="flash"[^>]*>No user with that email</);
  assert.match(res.text, /id="share-email" name="email" value="cy@example.com"/);
});

test('sharing with yourself is refused', async () => {
  const res = await ben.post(`/lists/${weekend}/share`, { email: 'ben@example.com' });
  assert.equal(res.status, 400);
  assert.match(res.text, /You already own this list/);
});

test('only the owner can share a list', async () => {
  const household = listId(pantry.readData(), 'Household');
  const res = await ben.post(`/lists/${household}/share`, { email: 'ben@example.com' });
  assert.equal(res.status, 404);
});
