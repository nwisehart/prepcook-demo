// Starts Pantry on a free port against a freshly seeded data file in a temp
// directory, and gives tests a tiny browser: cookies kept per client, forms
// posted the way the HTML forms post them, redirects left for the test to see.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function startPantry() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pantry-test-'));
  process.env.PANTRY_DATA_FILE = path.join(dir, 'pantry.json');
  process.env.PANTRY_LOG_FILE = path.join(dir, 'app.log');
  const { seed } = require('../scripts/seed');
  const { createApp } = require('../src/app');
  const { passwords } = seed();
  const server = await new Promise((resolve) => {
    const s = createApp().listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    dir,
    passwords,
    dataFile: process.env.PANTRY_DATA_FILE,
    client: () => new Client(baseUrl),
    readData: () => JSON.parse(fs.readFileSync(process.env.PANTRY_DATA_FILE, 'utf8')),
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
  }

  async request(method, pathname, form) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    let body;
    if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    const res = await fetch(`${this.baseUrl}${pathname}`, { method, headers, body, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0];
      this.cookie = pair.endsWith('=') ? '' : pair;
    }
    return { status: res.status, location: res.headers.get('location'), text: await res.text() };
  }

  get(pathname) {
    return this.request('GET', pathname);
  }

  post(pathname, form = {}) {
    return this.request('POST', pathname, form);
  }

  async signIn(email, password) {
    const res = await this.post('/login', { email, password });
    if (res.status !== 302) throw new Error(`sign-in failed for ${email}: ${res.status}`);
    return res;
  }
}

// Finds a list's id by its name in the data file.
function listId(data, name) {
  const list = data.lists.find((l) => l.name === name);
  if (!list) throw new Error(`no list called ${name}`);
  return list.id;
}

module.exports = { startPantry, listId };
