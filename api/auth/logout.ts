// POST /api/auth/logout: ends the session on this device.
import { signOut } from '../_lib/http.js';

export const POST = (req: Request) => signOut(req);
