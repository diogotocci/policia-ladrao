// POST /api/records: a finished match goes to the global ranking (V3 delivery 2).
import { envDeps, recordPost } from './_lib/http.js';

export const POST = (req: Request) => recordPost(req, envDeps());
