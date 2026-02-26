import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
import { startLicenseExpirationCron } from './cron/license-expiration.cron';

const server = app.listen(env.port, () => {
  console.log(`[Conveniência API] rodando em http://localhost:${env.port}`);
  console.log(`  Health: http://localhost:${env.port}/api/health`);
  console.log(`  CORS: ${env.corsOrigin}`);
  startLicenseExpirationCron();
});

export { server };

