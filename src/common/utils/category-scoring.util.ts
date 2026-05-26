import { ALL_CATEGORIES } from './level-category.util';

/** Puntos base al ganar o perder contra rivales de tu misma categoría. */
export const COMPETITIVE_BASE_POINTS = 20;

/** Variación por cada escalón de categoría respecto al rival. */
export const COMPETITIVE_POINTS_PER_STEP = 5;

/** Mínimo que podés sumar en una victoria. */
export const COMPETITIVE_MIN_WIN_POINTS = 5;

/** Mínimo que perdés en una derrota (magnitud; el valor es negativo). */
export const COMPETITIVE_MIN_LOSS_POINTS = 5;

/** Tope de puntos que podés perder en un partido. */
export const COMPETITIVE_MAX_LOSS_POINTS = 35;

export type CompetitiveMatchOutcome = 'win' | 'loss' | 'draw';

export function getCategoryIndex(category: string): number {
  const idx = ALL_CATEGORIES.indexOf(category as (typeof ALL_CATEGORIES)[number]);
  return idx >= 0 ? idx : ALL_CATEGORIES.length - 1;
}

function averageOpponentIndex(opponentCategories: string[]): number | null {
  if (opponentCategories.length === 0) return null;
  return (
    opponentCategories.reduce((sum, cat) => sum + getCategoryIndex(cat), 0) /
    opponentCategories.length
  );
}

/**
 * Puntos por partido competitivo según resultado y categoría de los rivales.
 *
 * Victoria:
 * - Misma categoría → +X
 * - Rivales peores → menos que X
 * - Rivales mejores → más que X
 *
 * Derrota:
 * - Misma categoría → −X
 * - Rivales peores → perdés más que X
 * - Rivales mejores → perdés menos que X
 */
export function computeCompetitiveMatchPoints(
  myCategory: string,
  opponentCategories: string[],
  outcome: CompetitiveMatchOutcome,
): number {
  if (outcome === 'draw') return 0;

  const myIdx = getCategoryIndex(myCategory);
  const avgOpponentIdx = averageOpponentIndex(opponentCategories);
  const adjustment =
    avgOpponentIdx == null ? 0 : Math.round((myIdx - avgOpponentIdx) * COMPETITIVE_POINTS_PER_STEP);

  if (outcome === 'win') {
    const raw = COMPETITIVE_BASE_POINTS + adjustment;
    return Math.max(COMPETITIVE_MIN_WIN_POINTS, raw);
  }

  const raw = -(COMPETITIVE_BASE_POINTS - adjustment);
  return Math.max(-COMPETITIVE_MAX_LOSS_POINTS, Math.min(-COMPETITIVE_MIN_LOSS_POINTS, raw));
}
