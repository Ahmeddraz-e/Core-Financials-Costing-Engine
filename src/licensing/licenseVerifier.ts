// src/licensing/licenseVerifier.ts
import crypto from 'crypto';
import os from 'os';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEATs7/n9J67SmZL2ioQ7GVow102bYqrlSaZfPsXXqBIyo=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  customer: string;
  issuedAt: number;
  expiresAt: number | null;
  id: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  payload?: LicensePayload;
}

export function verifyLicenseKey(licenseKeyBase64: string): VerifyResult {
  try {
    const licenseObject = JSON.parse(
      Buffer.from(licenseKeyBase64.trim(), 'base64').toString()
    );
    const data = Buffer.from(licenseObject.data, 'base64');
    const signature = Buffer.from(licenseObject.sig, 'base64');
    const publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM);

    const isValidSignature = crypto.verify(null, data, publicKey, signature);
    if (!isValidSignature) {
      return { valid: false, reason: 'كود التفعيل غير صحيح' };
    }

    const payload: LicensePayload = JSON.parse(data.toString());

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return { valid: false, reason: 'كود التفعيل منتهي الصلاحية' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'كود التفعيل غير صالح' };
  }
}

export function getMachineFingerprint(): string {
  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus().map((c: any) => c.model).join(','),
    os.totalmem().toString(),
    os.machine ? os.machine() : '',
  ];
  const raw = parts.join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}
