const express = require('express');
const store = require('./store');
const auth = require('./auth');
const views = require('./views');
const { requestLogger, logError } = require('./log');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.urlencoded({ extended: false }));

  // Liveness: 200 whenever the process is serving. The body says whether the
  // data file exists, because the seed runs after the server is up.
  app.get('/health', (req, res) => {
    if (store.exists()) return res.json({ status: 'ok' });
    res.json({ status: 'SeedMissing', hint: 'run node scripts/seed.js' });
  });

  app.use(auth.loadUser);
  app.use(require('./routes/session'));
  app.use(require('./routes/lists').router);
  app.use(require('./routes/items').router);
  app.use(require('./routes/sharing').router);

  app.use((req, res) => {
    res.status(404).send(views.errorPage({ user: req.user, title: 'Not found', text: 'There is no page here.' }));
  });

  // Express recognises an error handler by its four parameters.
  app.use((error, req, res, _next) => {
    logError(req, error);
    if (error instanceof store.SeedMissing) {
      return res.status(503).type('text/plain').send(`${error.name}: ${error.message}`);
    }
    res.status(500).send(views.errorPage({ user: req.user, title: 'Something went wrong', text: error.message }));
  });

  return app;
}

module.exports = { createApp };
