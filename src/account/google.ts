// The official "Fazer login com o Google" button (Google Identity Services), loaded only on the sign-in screens.
// The credential it returns is an ID token the server checks (api/_lib/google.ts); the game never sees a password.

interface Gis {
  accounts: {
    id: {
      initialize(o: {
        client_id: string;
        callback: (r: { credential?: string }) => void;
        ux_mode?: string;
        use_fedcm_for_button?: boolean;
      }): void;
      renderButton(el: HTMLElement, o: Record<string, string | number>): void;
    };
  };
}

const SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<Gis> | undefined;

function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  loading ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error('gis')));
    s.onerror = () => {
      loading = undefined; // offline now: the next screen tries again
      reject(new Error('gis'));
    };
    document.head.append(s);
  });
  return loading;
}

/** Draws Google's button in `el`; `onCredential` gets the ID token. Rejects when Google's script cannot load. */
export async function mountGoogleButton(el: HTMLElement, clientId: string, onCredential: (credential: string) => void): Promise<void> {
  const gis = await loadGis();
  gis.accounts.id.initialize({
    client_id: clientId,
    callback: (r) => r.credential && onCredential(r.credential),
    use_fedcm_for_button: true,
  });
  gis.accounts.id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    locale: 'pt-BR',
    width: 260,
  });
}
