import 'dotenv/config';
import app from './app.js';
import { prisma } from './shared/prisma.js';

const port = Number(process.env.PORT ?? 4000);

try {
  await prisma.$connect();
  app.listen(port, () => console.log(`POS API listening on port ${port}`));
} catch (error) {
  console.error('Unable to connect to the database:', error.message);
  process.exit(1);
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
