const crypto = require('node:crypto');
const store = require('./store');

const COOKIE = 'pantry_session';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

function verifyPassword(user, password) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

// The cookie is "<userId>.<hmac>"; the secret lives in the data file, so a
// re-seed signs everyone out.
function sessionCookie(userId, secret) {
  return `${userId}.${sign(userId, secret)}`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function userFromCookie(req, data) {
  const value = readCookie(req, COOKIE);
  if (!value) return undefined;
  const [userId, mac] = value.split('.');
  if (!userId || !mac) return undefined;
  const expected = sign(userId, data.sessionSecret);
  if (mac.length !== expected.length) return undefined;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return undefined;
  return store.findUserById(data, userId);
}

function setSession(res, userId, secret) {
  res.cookie(COOKIE, sessionCookie(userId, secret), { httpOnly: true, sameSite: 'lax', path: '/' });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

// Attaches req.user (or leaves it undefined) for every request. Without a
// data file every page fails with SeedMissing.
function loadUser(req, res, next) {
  req.user = userFromCookie(req, store.load());
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, loadUser, requireUser };
