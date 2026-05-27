/** Rango visible de skill (0–100) por categoría competitiva. */
export function getCategoryLevelRange(category: string): { min: number; max: number } {
  switch (category) {
    case '1ra':
      return { min: 88, max: 100 };
    case '2da':
      return { min: 76, max: 87 };
    case '3ra':
      return { min: 64, max: 75 };
    case '4ta':
      return { min: 52, max: 63 };
    case '5ta':
      return { min: 40, max: 51 };
    case '6ta':
      return { min: 28, max: 39 };
    case '7ma':
      return { min: 16, max: 27 };
    case '8va':
      return { min: 0, max: 15 };
    default:
      return { min: 0, max: 100 };
  }
}

export function defaultLevelBand(level: number, margin = 10): { min: number; max: number } {
  return {
    min: Math.max(0, Math.round(level - margin)),
    max: Math.min(100, Math.round(level + margin)),
  };
}
