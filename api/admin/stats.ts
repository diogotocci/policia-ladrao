// GET /api/admin/stats?days=7|30|90: the /admin panel's numbers, only for the admin account (V3 delivery 3).
import { adminStatsGet, envDeps } from '../_lib/http.js';

export const GET = (req: Request) => adminStatsGet(req, envDeps());
