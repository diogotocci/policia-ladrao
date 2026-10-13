// Digital Asset Links (V3 delivery 4): /.well-known/assetlinks.json tells Android that the Play app
// br.com.diogotocci.policialadrao may open policia-ladrao.xyz full screen (Trusted Web Activity, no browser bar).
// The SHA-256 fingerprints come from the Vercel variable ANDROID_SHA256_FINGERPRINTS at build time (Play Console >
// App integrity > App signing key, plus the upload key for test builds), so a new key needs no code change.
export const ANDROID_PACKAGE = 'br.com.diogotocci.policialadrao';
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** the fingerprints in the variable (comma or space separated); anything malformed is left out */
export function parseFingerprints(raw: string | undefined): string[] {
  return [
    ...new Set(
      (raw ?? '')
        .split(/[\s,]+/)
        .map((f) => f.trim().toUpperCase())
        .filter((f) => FINGERPRINT.test(f)),
    ),
  ];
}

export function assetLinks(fingerprints: string[], pkg = ANDROID_PACKAGE): string {
  return `${JSON.stringify(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fingerprints },
      },
    ],
    null,
    2,
  )}\n`;
}
