// Música chiptune: sequenciador puro e determinístico (semicolcheias), tocado pelo mixer com antecedência.

export type MusicVoice = 'bass' | 'lead' | 'kick' | 'snare' | 'hat';

export interface Note {
  voice: MusicVoice;
  midi: number; // percussão usa 0
  at: number; // s a partir do início do quadro atual
  dur: number; // s
}

export interface Song {
  bpm: number;
  length: number; // passos (múltiplo de 16)
  bass: (number | null)[];
  lead: (number | null)[];
  drums: ('k' | 's' | 'h' | null)[];
}

export const stepSeconds = (bpm: number) => 60 / bpm / 4;

// notas: "A2" etc.; "." = pausa
const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function parse(seq: string): (number | null)[] {
  return seq
    .trim()
    .split(/\s+/)
    .map((t) => {
      if (t === '.') return null;
      const m = /^([A-G]#?)(\d)$/.exec(t);
      if (!m) throw new Error(`nota inválida: ${t}`);
      return 12 * (Number(m[2]) + 1) + NAMES[m[1]!]!;
    });
}

// 4 compassos: Am · Am · F · G (perseguição em lá menor)
const BASS = parse(`
A2 . A2 A3  . A2 . A2  A2 . A2 A3  . G2 . G2
A2 . A2 A3  . A2 . A2  A2 . C3 .   D3 . E3 .
F2 . F2 F3  . F2 . F2  F2 . F2 F3  . E2 . E2
G2 . G2 G3  . G2 . G2  G2 . G2 G3  . G2 B2 D3
`);
const LEAD = parse(`
A4 . C5 .   E5 . D5 .  C5 . B4 .   A4 . . .
A4 . C5 .   E5 . G5 .  E5 . D5 .   C5 . D5 .
C5 . . A4   F5 . E5 .  D5 . C5 .   A4 . C5 .
B4 . D5 .   G5 . F5 .  D5 . B4 .   D5 . E5 .
`);
const DRUM_BAR = ['k', null, 'h', null, 's', null, 'h', null, 'k', null, 'k', 'h', 's', null, 'h', null] as const;

export const SONG: Song = {
  bpm: 140,
  length: 64,
  bass: BASS,
  lead: LEAD,
  drums: Array.from({ length: 64 }, (_, i) => DRUM_BAR[i % 16]!),
};

// Menu: mais calmo (110 bpm), lá menor arpejado, sem bateria pesada
const MENU_BASS = parse(`
A2 . . .   . . . .   E2 . . .   . . . .
F2 . . .   . . . .   G2 . . .   . . . .
`);
const MENU_LEAD = parse(`
A4 . C5 .  E5 . C5 .  B4 . E5 .  G4 . E5 .
A4 . C5 .  F5 . C5 .  B4 . D5 .  G5 . D5 .
`);
const MENU_DRUM = ['k', null, null, null, 'h', null, null, null, 'k', null, null, null, 'h', null, null, null] as const;

export const MENU_SONG: Song = {
  bpm: 110,
  length: 32,
  bass: MENU_BASS,
  lead: MENU_LEAD,
  drums: Array.from({ length: 32 }, (_, i) => MENU_DRUM[i % 16]!),
};

export function createSequencer(song: Song): {
  step(dt: number, intense: boolean): Note[];
  /** exatamente um passo (at = 0) e avança — usado pelo agendador no relógio do áudio */
  next(intense: boolean): Note[];
  stepIndex(): number;
  reset(): void;
} {
  const len = stepSeconds(song.bpm);
  let idx = 0;
  let nextIn = 0;
  const notesAt = (i: number, at: number, intense: boolean): Note[] => {
    const k = i % song.length;
    const out: Note[] = [];
    const b = song.bass[k];
    if (b != null) out.push({ voice: 'bass', midi: b, at, dur: len * 0.9 });
    const l = song.lead[k];
    if (l != null) out.push({ voice: 'lead', midi: l, at, dur: len * 1.6 });
    const d = song.drums[k];
    if (d === 'k') out.push({ voice: 'kick', midi: 0, at, dur: 0.12 });
    else if (d === 's') out.push({ voice: 'snare', midi: 0, at, dur: 0.12 });
    else if (d === 'h' || (intense && d == null)) out.push({ voice: 'hat', midi: 0, at, dur: 0.04 }); // camada extra quando aperta
    return out;
  };
  return {
    step(dt, intense) {
      const out: Note[] = [];
      let offset = nextIn;
      while (offset < dt) {
        out.push(...notesAt(idx, offset, intense));
        idx++;
        offset += len;
      }
      nextIn = offset - dt;
      return out;
    },
    next(intense) {
      return notesAt(idx++, 0, intense);
    },
    stepIndex: () => idx,
    reset() {
      idx = 0;
      nextIn = 0;
    },
  };
}
