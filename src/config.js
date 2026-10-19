const path = require('node:path');

const root = path.resolve(__dirname, '..');

// Paths are read on every call so tests (and the seed script) can point a
// running process at a different file through the environment.
function dataFile() {
  return path.resolve(process.env.PANTRY_DATA_FILE || path.join(root, 'data', 'pantry.json'));
}

function logFile() {
  return path.resolve(process.env.PANTRY_LOG_FILE || path.join(root, 'logs', 'app.log'));
}

module.exports = { root, dataFile, logFile };
