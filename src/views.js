// Server-rendered pages as template strings. Every value that came from a
// user goes through `h` (HTML escaping) before it reaches the markup.

function h(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const style = `
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; color: #222; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; margin-bottom: 1.5rem; }
  header a { color: inherit; text-decoration: none; font-weight: 600; }
  form.inline { display: inline; }
  label { display: block; margin: .5rem 0 .25rem; }
  input[type=text], input[type=email], input[type=password], input[type=number] { padding: .35rem; font: inherit; }
  button { font: inherit; padding: .3rem .7rem; cursor: pointer; }
  ul.plain { list-style: none; padding: 0; }
  ul.plain li { padding: .35rem 0; border-bottom: 1px solid #eee; }
  .bought .item-name { text-decoration: line-through; color: #888; }
  .count { color: #555; font-size: .9em; }
  .flash { padding: .5rem .75rem; border-radius: 4px; }
  .flash.notice { background: #e8f5e9; }
  .flash.error { background: #fdecea; }
  section { margin-top: 2rem; }
`;

function layout({ title, user, body }) {
  const account = user
    ? `<span data-testid="current-user">${h(user.email)}</span>
       <form class="inline" method="post" action="/logout" id="logout-form">
         <button type="submit" id="sign-out">Sign out</button>
       </form>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${h(title)} · Pantry</title>
  <style>${style}</style>
</head>
<body>
  <header><a href="/lists" id="home">Pantry</a><div>${account}</div></header>
  <main>
${body}
  </main>
</body>
</html>`;
}

function flash(message) {
  if (!message) return '';
  const role = message.kind === 'error' ? 'alert' : 'status';
  return `<p id="flash" data-testid="flash" class="flash ${message.kind}" role="${role}">${h(message.text)}</p>`;
}

function loginPage({ email = '', error } = {}) {
  return layout({
    title: 'Sign in',
    body: `
    <h1>Sign in</h1>
    ${flash(error && { kind: 'error', text: error })}
    <form method="post" action="/login" id="login-form">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" value="${h(email)}" required autocomplete="username">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password">
      <p><button type="submit" id="sign-in">Sign in</button></p>
    </form>`,
  });
}

function countLabel(n) {
  return `${n} to buy`;
}

function listLink(list, unbought, note = '') {
  return `<li data-testid="list-row" data-list-name="${h(list.name)}">
        <a href="/lists/${h(list.id)}">${h(list.name)}</a>
        <span class="count" data-testid="list-unbought-count">${countLabel(unbought)}</span>${note}
      </li>`;
}

function listsPage({ user, owned, shared }) {
  const ownedRows = owned.map(({ list, unbought }) => listLink(list, unbought)).join('\n');
  const sharedRows = shared
    .map(({ list, unbought, owner }) =>
      listLink(list, unbought, `<span class="count" data-testid="list-owner"> · from ${h(owner.name)}</span>`),
    )
    .join('\n');
  return layout({
    title: 'Your lists',
    user,
    body: `
    <h1>Your lists</h1>
    <ul class="plain" id="my-lists" data-testid="my-lists">
      ${ownedRows || '<li data-testid="no-lists">No lists yet.</li>'}
    </ul>
    <form method="post" action="/lists" id="new-list-form">
      <label for="new-list-name">New list</label>
      <input type="text" id="new-list-name" name="name" required maxlength="80">
      <button type="submit" id="create-list">Create list</button>
    </form>
    <section id="shared-with-me" data-testid="shared-with-me">
      <h2>Shared with me</h2>
      <ul class="plain">
        ${sharedRows || '<li data-testid="nothing-shared">Nothing shared with you yet.</li>'}
      </ul>
    </section>`,
  });
}

function itemRow(list, item) {
  const base = `/lists/${h(list.id)}/items/${h(item.id)}`;
  return `<li data-testid="item" data-item-name="${h(item.name)}" class="${item.bought ? 'bought' : ''}">
        <span class="item-name">${h(item.name)}</span>
        <span class="count" data-testid="item-quantity">× ${h(item.quantity)}</span>
        <form class="inline" method="post" action="${base}/toggle">
          <button type="submit" data-testid="toggle-item">${item.bought ? 'Mark not bought' : 'Mark bought'}</button>
        </form>
        <form class="inline" method="post" action="${base}/delete">
          <button type="submit" data-testid="delete-item">Delete</button>
        </form>
      </li>`;
}

function listPage({ user, list, owner, sharedWith, unbought, message, shareEmail = '' }) {
  const isOwner = list.ownerId === user.id;
  const items = list.items.map((item) => itemRow(list, item)).join('\n');
  const sharedNames = sharedWith
    .map((u) => `<li data-testid="shared-with-user">${h(u.name)} (${h(u.email)})</li>`)
    .join('');
  const ownerTools = isOwner
    ? `
    <section id="share" data-testid="share-section">
      <h2>Share</h2>
      <ul class="plain" data-testid="shared-with">${sharedNames || '<li>Not shared with anyone.</li>'}</ul>
      <form method="post" action="/lists/${h(list.id)}/share" id="share-form">
        <label for="share-email">Share with (email)</label>
        <input type="text" id="share-email" name="email" value="${h(shareEmail)}" required>
        <button type="submit" id="share-submit">Share</button>
      </form>
    </section>
    <section id="manage">
      <h2>Manage</h2>
      <form method="post" action="/lists/${h(list.id)}/rename" id="rename-list-form">
        <label for="rename-list-name">Rename list</label>
        <input type="text" id="rename-list-name" name="name" value="${h(list.name)}" required maxlength="80">
        <button type="submit" id="rename-list">Rename</button>
      </form>
      <form method="post" action="/lists/${h(list.id)}/delete" id="delete-list-form">
        <p><button type="submit" id="delete-list">Delete list</button></p>
      </form>
    </section>`
    : `<p class="count" data-testid="list-owner">Shared with you by ${h(owner.name)}.</p>`;
  return layout({
    title: list.name,
    user,
    body: `
    <p><a href="/lists" id="back-to-lists">← All lists</a></p>
    <h1><span data-testid="list-name">${h(list.name)}</span>
      <span class="count" data-testid="unbought-count">${countLabel(unbought)}</span></h1>
    ${flash(message)}
    <ul class="plain" id="items" data-testid="items">
      ${items || '<li data-testid="no-items">Nothing on this list yet.</li>'}
    </ul>
    <form method="post" action="/lists/${h(list.id)}/items" id="add-item-form">
      <label for="item-name">Item</label>
      <input type="text" id="item-name" name="name" required maxlength="80">
      <label for="item-quantity">Quantity</label>
      <input type="number" id="item-quantity" name="quantity" value="1" min="1" max="999">
      <button type="submit" id="add-item">Add item</button>
    </form>
    ${ownerTools}`,
  });
}

function errorPage({ user, title, text }) {
  return layout({
    title,
    user,
    body: `
    <h1>${h(title)}</h1>
    <p data-testid="error-message">${h(text)}</p>
    <p><a href="/lists">Back to your lists</a></p>`,
  });
}

module.exports = { h, loginPage, listsPage, listPage, errorPage };
