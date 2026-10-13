// V3 delivery 4: the Digital Asset Links file that lets the Play app open the site full screen.
import { describe, expect, it } from 'vitest';
import { ANDROID_PACKAGE, assetLinks, parseFingerprints } from '../../src/pwa/assetlinks';

const A = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':');
const B = A.replace(/^00/, 'FF');

describe('assetlinks.json', () => {
  it('takes the fingerprints from the variable (comma or space separated, any case); malformed ones are left out', () => {
    expect(parseFingerprints(`${A.toLowerCase()}, ${B}\n${A} not-a-fingerprint AB:CD`)).toEqual([A, B]);
    expect(parseFingerprints(undefined)).toEqual([]);
  });
  it('declares the Play app for the whole site', () => {
    const [entry] = JSON.parse(assetLinks([A, B])) as [{ relation: string[]; target: Record<string, unknown> }];
    expect(entry.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(entry.target).toEqual({ namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: [A, B] });
  });
});
