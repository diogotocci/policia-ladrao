// O que o jogador (ou a IA) quer fazer neste passo.
export interface Intents {
  left: boolean;
  right: boolean;
  brake: boolean;
  fire: boolean;
  bomb: boolean;
}

export const NO_INTENTS: Intents = Object.freeze({
  left: false,
  right: false,
  brake: false,
  fire: false,
  bomb: false,
});
