export const MAX_TURNS = 3;

/** Score awarded for solving on a given turn number (1-indexed). 0 if never solved. */
export const SCORE_BY_TURN: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
};
