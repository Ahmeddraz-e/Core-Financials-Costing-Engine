import { Router } from 'express';
import Database from 'better-sqlite3';
import { verifyLicenseKey, getMachineFingerprint } from '../licensing/licenseVerifier';

export function licenseRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    try {
      const row = db.prepare('SELECT * FROM license_activation WHERE id = 1').get() as any;
      if (!row) {
        res.json({ isActivated: false, customer: null });
        return;
      }

      const fingerprint = getMachineFingerprint();
      if (row.machine_fingerprint !== fingerprint) {
        res.json({ isActivated: false, customer: null, reason: 'Machine mismatch' });
        return;
      }

      if (row.expires_at && Date.now() > row.expires_at) {
        res.json({ isActivated: false, customer: row.customer, reason: 'License expired' });
        return;
      }

      res.json({ isActivated: true, customer: row.customer });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/activate', (req, res) => {
    try {
      const { licenseKey } = req.body;
      if (!licenseKey) {
        res.status(400).json({ success: false, reason: 'License key is required' });
        return;
      }

      const result = verifyLicenseKey(licenseKey);
      if (!result.valid) {
        res.json({ success: false, reason: result.reason });
        return;
      }

      const fingerprint = getMachineFingerprint();
      const now = Date.now();

      const payload = result.payload!;
      db.prepare(`
        INSERT INTO license_activation (id, license_key, machine_fingerprint, activated_at, customer, expires_at)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          license_key = excluded.license_key,
          machine_fingerprint = excluded.machine_fingerprint,
          activated_at = excluded.activated_at,
          customer = excluded.customer,
          expires_at = excluded.expires_at
      `).run(licenseKey, fingerprint, now, payload.customer, payload.expiresAt);

      res.json({ success: true, customer: payload.customer });
    } catch (err: any) {
      res.status(500).json({ success: false, reason: err.message });
    }
  });

  return router;
}
