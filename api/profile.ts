// GET /api/profile: the progress saved in the account. PUT /api/profile {data, baseRev}: saves (merging when needed).
import { envDeps, profileGet, profilePut } from './_lib/http.js';

export const GET = (req: Request) => profileGet(req, envDeps());
export const PUT = (req: Request) => profilePut(req, envDeps());
