// POST /api/auth/google {credential}: signs in with the token from the Google button.
import { envDeps, signIn } from '../_lib/http.js';

export const POST = (req: Request) => signIn(req, envDeps());
