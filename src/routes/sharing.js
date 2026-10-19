const express = require('express');
const store = require('../store');
const views = require('../views');
const { requireUser } = require('../auth');
const { listView, notFound } = require('./lists');

const router = express.Router();
router.use('/lists', requireUser);

// Only the owner can share. Sharing with someone who already has the list is
// a no-op that still reports success.
router.post('/lists/:listId/share', (req, res) => {
  const email = String(req.body.email || '').trim();
  const data = store.load();
  const list = store.findList(data, req.params.listId);
  if (!list || list.ownerId !== req.user.id) return notFound(res, req.user);

  const fail = (status, text) =>
    res
      .status(status)
      .send(views.listPage(listView(data, list, req.user, { message: { kind: 'error', text }, shareEmail: email })));

  const target = data.users.find((u) => u.email === email);
  if (!target) return fail(404, 'No user with that email');
  if (target.id === list.ownerId) return fail(400, 'You already own this list');

  if (!list.sharedWith.includes(target.id)) {
    list.sharedWith.push(target.id);
    store.save(data);
  }
  res.redirect(`/lists/${list.id}?shared=${target.id}`);
});

module.exports = { router };
