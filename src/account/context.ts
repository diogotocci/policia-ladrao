// Where the game runs, for the usage events (V3 delivery 3): the Play app (a Trusted Web Activity opens the site with an
// android-app:// referrer), the web app installed on the home screen, or a browser tab.
import type { EventContext } from '../meta/events';

export function eventContext(
  version: string | undefined,
  env: { referrer: string; standalone: boolean } = {
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    standalone:
      typeof matchMedia !== 'undefined' &&
      (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches),
  },
): EventContext {
  const client = env.referrer.startsWith('android-app://') ? 'play' : env.standalone ? 'pwa' : 'web';
  return { version: version ?? 'dev', client };
}
