const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  console.log(`Pantry listening on http://127.0.0.1:${port}`);
});
