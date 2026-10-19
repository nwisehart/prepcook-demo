const express = require('express');
const store = require('../store');
const { requireUser } = require('../auth');
const { notFound } = require('./lists');

const router = express.Router();
router.use('/lists', requireUser);

function parseQuantity(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 999);
}

// Runs `fn(list, data)` against a list the signed-in user may edit, saves, and
// redirects back to the list. Owners and people it is shared with may edit items.
function withList(req, res, fn) {
  const found = store.update((data) => {
    const list = store.findList(data, req.params.listId);
    if (!list || !store.canView(list, req.user)) return false;
    return fn(list, data) !== false;
  });
  if (!found) return notFound(res, req.user);
  res.redirect(`/lists/${req.params.listId}`);
}

router.post('/lists/:listId/items', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  withList(req, res, (list) => {
    if (!name) return;
    list.items.push({ id: store.newId(), name, quantity: parseQuantity(req.body.quantity), bought: false });
  });
});

router.post('/lists/:listId/items/:itemId/toggle', (req, res) => {
  withList(req, res, (list) => {
    const item = list.items.find((i) => i.id === req.params.itemId);
    if (!item) return false;
    item.bought = !item.bought;
  });
});

router.post('/lists/:listId/items/:itemId/delete', (req, res) => {
  withList(req, res, (list) => {
    const index = list.items.findIndex((i) => i.id === req.params.itemId);
    if (index === -1) return false;
    list.items.splice(index, 1);
  });
});

module.exports = { router };
