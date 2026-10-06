// What the player (or the AI) wants to do this step.
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
