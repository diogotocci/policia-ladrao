// GET /api/ranking?mode=&side=&difficulty=: one board of the global ranking (V3 delivery 2).
// POST /api/ranking {username}: reports a name seen there (kept in this function: the Hobby plan allows 12 functions).
import { envDeps, rankingGet, reportPost } from './_lib/http.js';

export const GET = (req: Request) => rankingGet(req, envDeps());
export const POST = (req: Request) => reportPost(req, envDeps());
