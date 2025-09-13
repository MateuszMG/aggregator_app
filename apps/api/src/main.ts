import { createApp } from './app';

const port = Number(process.env.PORT) || 3001;
const app = createApp();
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
