// GET /api/ranking?mode=&side=&difficulty=: one board of the global ranking (V3 delivery 2).
import { envDeps, rankingGet } from './_lib/http.js';

export const GET = (req: Request) => rankingGet(req, envDeps());
