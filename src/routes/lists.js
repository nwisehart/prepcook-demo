const express = require('express');
const store = require('../store');
const views = require('../views');
const { requireUser } = require('../auth');

const router = express.Router();
router.use('/lists', requireUser);

function cleanName(value) {
  return String(value || '').trim().slice(0, 80);
}

function notFound(res, user) {
  return res.status(404).send(views.errorPage({ user, title: 'Not found', text: 'That list does not exist.' }));
}

// Everything the list page needs, from one load of the store.
function listView(data, list, user, extra = {}) {
  return {
    user,
    list,
    owner: store.findUserById(data, list.ownerId),
    sharedWith: list.sharedWith.map((id) => store.findUserById(data, id)).filter(Boolean),
    unbought: store.unboughtCount(list),
    ...extra,
  };
}

router.get('/', (req, res) => res.redirect(req.user ? '/lists' : '/login'));

router.get('/lists', (req, res) => {
  const data = store.load();
  const row = (list) => ({
    list,
    unbought: store.unboughtCount(list),
    owner: store.findUserById(data, list.ownerId),
  });
  const owned = data.lists.filter((l) => l.ownerId === req.user.id).map(row);
  const shared = data.lists.filter((l) => l.sharedWith.includes(req.user.id)).map(row);
  res.send(views.listsPage({ user: req.user, owned, shared }));
});

router.post('/lists', (req, res) => {
  const name = cleanName(req.body.name);
  if (!name) return res.redirect('/lists');
  const id = store.update((data) => {
    const list = { id: store.newId(), ownerId: req.user.id, name, sharedWith: [], items: [] };
    data.lists.push(list);
    return list.id;
  });
  res.redirect(`/lists/${id}`);
});

router.get('/lists/:listId', (req, res) => {
  const data = store.load();
  const list = store.findList(data, req.params.listId);
  if (!list || !store.canView(list, req.user)) return notFound(res, req.user);
  // ?shared=<userId> after a successful share names who it went to.
  const sharedUser = list.sharedWith.includes(req.query.shared)
    ? store.findUserById(data, req.query.shared)
    : undefined;
  const message = sharedUser && { kind: 'notice', text: `Shared with ${sharedUser.email}.` };
  res.send(views.listPage(listView(data, list, req.user, { message })));
});

router.post('/lists/:listId/rename', (req, res) => {
  const name = cleanName(req.body.name);
  const found = store.update((data) => {
    const list = store.findList(data, req.params.listId);
    if (!list || list.ownerId !== req.user.id) return false;
    if (name) list.name = name;
    return true;
  });
  if (!found) return notFound(res, req.user);
  res.redirect(`/lists/${req.params.listId}`);
});

router.post('/lists/:listId/delete', (req, res) => {
  const found = store.update((data) => {
    const index = data.lists.findIndex((l) => l.id === req.params.listId && l.ownerId === req.user.id);
    if (index === -1) return false;
    data.lists.splice(index, 1);
    return true;
  });
  if (!found) return notFound(res, req.user);
  res.redirect('/lists');
});

module.exports = { router, listView, notFound };
