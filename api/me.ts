// GET /api/me: the signed-in account (and a renewed session), or 401.
import { envDeps, me } from './_lib/http.js';

export const GET = (req: Request) => me(req, envDeps());
