// Google sign-in (V3 part 1): checks the ID token the "Fazer login com o Google" button returns. Signature against
// Google's public keys, issuer, audience (our Client ID), expiry and a verified e-mail.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

let googleKeys: JWTVerifyGetKey | undefined;
const keys = () => (googleKeys ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')));

export async function verifyGoogleToken(
  token: unknown,
  clientId: string | undefined,
  getKey: JWTVerifyGetKey = keys(),
): Promise<GoogleUser | undefined> {
  if (typeof token !== 'string' || !token || !clientId) return undefined;
  try {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    if (!payload.sub || !str(payload.email) || payload.email_verified !== true) return undefined;
    return { sub: payload.sub, email: str(payload.email), name: str(payload.name), picture: str(payload.picture) };
  } catch {
    return undefined;
  }
}
