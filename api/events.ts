// POST /api/events: usage events from the phone for the /admin panel (V3 delivery 3).
import { envDeps, eventsPost } from './_lib/http.js';

export const POST = (req: Request) => eventsPost(req, envDeps());
