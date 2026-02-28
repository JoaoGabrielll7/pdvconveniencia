import cron from 'node-cron';
import { licenseService } from '../services/license.service';

let initialized = false;

export function startLicenseExpirationCron(): void {
  if (initialized) return;
  initialized = true;

  // Executa diariamente às 02:00 (hora do servidor).
  cron.schedule('0 2 * * *', async () => {
    try {
      const expiredCount = await licenseService.expireOutdatedLicenses();
      if (expiredCount > 0) {
        console.log(`[license-cron] licencas expiradas automaticamente: ${expiredCount}`);
      }
    } catch (error) {
      console.error('[license-cron] erro ao expirar licencas automaticamente', error);
    }
  });
}

