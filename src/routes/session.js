const express = require('express');
const store = require('../store');
const auth = require('../auth');
const views = require('../views');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/lists');
  res.send(views.loginPage());
});

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const data = store.load();
  const user = data.users.find((u) => u.email === email);
  if (!user || !auth.verifyPassword(user, password)) {
    return res.status(401).send(views.loginPage({ email: req.body.email, error: 'Wrong email or password.' }));
  }
  auth.setSession(res, user.id, data.sessionSecret);
  res.redirect('/lists');
});

router.post('/logout', (req, res) => {
  auth.clearSession(res);
  res.redirect('/login');
});

module.exports = router;
