// GET /api/admin/stats?days=7|30|90: the /admin panel's numbers, only for the admin account (V3 delivery 3).
// GET ?view=reports and POST {userId, action}: the "Denúncias" tab (kept in this function: the Hobby plan allows 12).
import { adminActPost, adminStatsGet, envDeps } from '../_lib/http.js';

export const GET = (req: Request) => adminStatsGet(req, envDeps());
export const POST = (req: Request) => adminActPost(req, envDeps());
