/** Rango visible de skill (0–1000) por categoría competitiva. */
export function getCategoryLevelRange(category: string): { min: number; max: number } {
  switch (category) {
    case '1ra':
      return { min: 880, max: 1000 };
    case '2da':
      return { min: 760, max: 879 };
    case '3ra':
      return { min: 640, max: 759 };
    case '4ta':
      return { min: 520, max: 639 };
    case '5ta':
      return { min: 400, max: 519 };
    case '6ta':
      return { min: 280, max: 399 };
    case '7ma':
      return { min: 160, max: 279 };
    case '8va':
      return { min: 0, max: 159 };
    default:
      return { min: 0, max: 1000 };
  }
}

export function defaultLevelBand(level: number, margin = 100): { min: number; max: number } {
  return {
    min: Math.max(0, Math.round(level - margin)),
    max: Math.min(1000, Math.round(level + margin)),
  };
}
