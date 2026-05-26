/** Convierte nivel de pádel (1–7) a rating numérico para categorías. */
export function levelToRating(level: number | null | undefined): number {
  const l = level != null ? Number(level) : 2.5;
  return Math.round(1000 + (l - 2.5) * 80);
}
