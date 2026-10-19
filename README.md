# Pantry

Pantry is a small grocery-list web app, and the demo repository for
[Prepcook](https://github.com/nwisehart/prepcook): clone it, point Prepcook
at it, paste the bug report below as a card, and watch Prepcook reproduce the
bug, explain it, fix it and open a pull request.

People sign in with an email and password, keep lists, add items with a
quantity, tick them off as bought (the list header counts what is still to buy),
and share a list with another person by email; it then shows up on their page
under **Shared with me**.

It is deliberately small: Node 20+, Express, server-rendered HTML forms, no
client-side JavaScript, no build step, and all data in one JSON file.

The user guide — what a support agent answers customers from — is in [docs/](docs/).

## Running it on its own

```sh
npm ci
node scripts/seed.js     # creates data/pantry.json and writes the test login to data/seed.env
node server.js           # http://localhost:3000 (or $PORT)
npm test
```

The seed creates two people, `ann@example.com` and `ben@example.com`, each with
a random password generated on every run. Ben's password is in `data/seed.env`
(or appended to `$PREPCOOK_ENV_OUT` when that is set). Ben owns a list called
**Weekend**; Ann owns **Household** and shares it with Ben. Re-running the seed
starts over from scratch and signs everyone out.

| Setting | Default |
| --- | --- |
| `PORT` | `3000` |
| `PANTRY_DATA_FILE` | `data/pantry.json` |
| `PANTRY_LOG_FILE` | `logs/app.log` (one JSON line per request) |

`GET /health` answers 200 with `{"status":"ok"}`, or `{"status":"SeedMissing"}`
before the seed has run; every other page fails with `SeedMissing` until it has.

## Layout

```
server.js                starts the server
src/app.js               middleware, routes, error handling
src/routes/              session (sign-in/out), lists, items, sharing
src/store.js             the JSON data file
src/auth.js              passwords and the signed session cookie
src/views.js             the HTML pages
src/log.js               logs/app.log
scripts/seed.js          test data
test/                    node:test suites, run against a real server
.prepcook/scripts.toml   how Prepcook sets up, starts, seeds and tests the app
```

## The bug report

This is the report as it was filed. It is also in [BUG.md](BUG.md), ready to
paste into a Prepcook card.

> ### Sharing a list fails for a user who exists
>
> **Steps to reproduce**
>
> 1. Sign in as Ben (ben@example.com).
> 2. Open the "Weekend" list.
> 3. Under "Share", type `Ann@Example.com` and press **Share**.
>
> **Expected:** the list is shared, and Ann sees "Weekend" under "Shared with
> me" when she signs in.
>
> **Actual:** the page says "No user with that email". Ann definitely has an
> account — she signs in every day.
>
> It seems to work when the email is typed in lower case, sometimes? Not sure
> if that's related.

## License

Apache-2.0. See [LICENSE](LICENSE).
