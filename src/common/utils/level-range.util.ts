/** Rango de nivel de pádel (1–7) por categoría competitiva. */
export function getCategoryLevelRange(category: string): { min: number; max: number } {
  switch (category) {
    case '1ra':
      return { min: 6, max: 7 };
    case '2da':
      return { min: 5.5, max: 6.5 };
    case '3ra':
      return { min: 5, max: 6 };
    case '4ta':
      return { min: 4, max: 5.5 };
    case '5ta':
      return { min: 3, max: 4.5 };
    case '6ta':
      return { min: 2, max: 3.5 };
    case '7ma':
      return { min: 1, max: 2.5 };
    default:
      return { min: 1, max: 7 };
  }
}

export function defaultLevelBand(level: number, margin = 0.5): { min: number; max: number } {
  return {
    min: Math.max(1, Math.round((level - margin) * 10) / 10),
    max: Math.min(7, Math.round((level + margin) * 10) / 10),
  };
}
