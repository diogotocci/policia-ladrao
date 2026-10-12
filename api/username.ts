// GET /api/username?u=name: free and allowed? POST /api/username {username}: chooses or changes it.
import { envDeps, usernameCheck, usernameSet } from './_lib/http.js';

export const GET = (req: Request) => usernameCheck(req, envDeps());
export const POST = (req: Request) => usernameSet(req, envDeps());
