/**
 * Deriva la categoría de nivel del jugador a partir de su rating (puntuación tipo Playtomic).
 *
 * Categorías (del PDR: "6ta / 1.240 pts"):
 * - 1ra: rating >= 2000 (profesional)
 * - 2da: rating >= 1700
 * - 3ra: rating >= 1400
 * - 4ta: rating >= 1200
 * - 5ta: rating >= 1000
 * - 6ta: rating >= 800
 * - 7ma: rating < 800 (principiante)
 *
 * Estos rangos son configurables en el futuro; por ahora, hardcoded para MVP.
 */
export function getLevelCategory(rating: number): string {
  if (rating >= 2000) return '1ra';
  if (rating >= 1700) return '2da';
  if (rating >= 1400) return '3ra';
  if (rating >= 1200) return '4ta';
  if (rating >= 1000) return '5ta';
  if (rating >= 800) return '6ta';
  return '7ma';
}

/**
 * Retorna el rango de rating para una categoría dada.
 * Útil para filtrar matchmaking por categoría.
 */
export function getCategoryRatingRange(category: string): { min: number; max: number } {
  switch (category) {
    case '1ra': return { min: 2000, max: 9999 };
    case '2da': return { min: 1700, max: 1999 };
    case '3ra': return { min: 1400, max: 1699 };
    case '4ta': return { min: 1200, max: 1399 };
    case '5ta': return { min: 1000, max: 1199 };
    case '6ta': return { min: 800, max: 999 };
    case '7ma': return { min: 0, max: 799 };
    default: return { min: 0, max: 9999 };
  }
}

/**
 * Lista de todas las categorías disponibles.
 */
export const ALL_CATEGORIES = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma'];

