// DELETE /api/account {confirm}: deletes the account and everything tied to it (Google Play rule, spec §4.5).
import { accountDelete, envDeps } from './_lib/http.js';

export const DELETE = (req: Request) => accountDelete(req, envDeps());
