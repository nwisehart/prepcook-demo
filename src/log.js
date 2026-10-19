const fs = require('node:fs');
const path = require('node:path');
const { logFile } = require('./config');

// One JSON line per request and per error in logs/app.log. Paths are logged
// without their query string, and request bodies (passwords) never are.
function write(entry) {
  const file = logFile();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
  } catch (error) {
    console.error('could not write app log:', error.message);
  }
}

function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    write({
      level: 'info',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      user: req.user ? req.user.id : null,
    });
  });
  next();
}

function logError(req, error) {
  write({
    level: 'error',
    method: req.method,
    path: req.path,
    error: error.name,
    message: error.message,
    stack: error.stack,
  });
}

module.exports = { requestLogger, logError };
