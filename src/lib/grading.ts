export const MAX_TURNS = 3;

/** Score awarded for solving on a given turn number (1-indexed). 0 if never solved. */
export const SCORE_BY_TURN: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
};

export interface ScoreBreakdown {
  turnBase: number;
  tokenPenalty: number;
  score: number;
}

/**
 * Turn number sets the ceiling; token usage (summed across every turn of this
 * attempt, not just the winning one) can only pull the score down from there,
 * capped so it can never wipe out the turn-number credit entirely.
 */
export function computeScore(turnNumber: number, cumulativeTokens: number, tokenBudget: number): ScoreBreakdown {
  const turnBase = SCORE_BY_TURN[turnNumber] ?? 0;
  const ratio = cumulativeTokens / tokenBudget;
  const tokenPenalty = ratio <= 1 ? 0 : Math.min(20, Math.round((ratio - 1) * 20));
  return { turnBase, tokenPenalty, score: Math.max(turnBase - tokenPenalty, 0) };
}
