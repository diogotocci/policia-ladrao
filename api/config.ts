// GET /api/config: what the game needs to show the Google button (the Client ID is public).
import { config, envDeps } from './_lib/http.js';

export const GET = () => config(envDeps());
