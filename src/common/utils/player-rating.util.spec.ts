import {
  DEFAULT_PLAYER_RATING,
  getInitialRatingForCategory,
  computeEloDelta,
  expectedScore,
  levelToRating,
  ratingToSkillScore,
  resolvePlayerRating,
} from './player-rating.util';

describe('player-rating.util', () => {
  it('usa el rating persistido cuando existe', () => {
    expect(resolvePlayerRating({ rating: 1117, level: 3.5 })).toBe(1117);
  });

  it('deriva el rating desde level cuando todavía no fue persistido', () => {
    expect(resolvePlayerRating({ level: 3.5 })).toBe(levelToRating(3.5));
    expect(resolvePlayerRating({})).toBe(DEFAULT_PLAYER_RATING);
  });

  it('convierte el rating a skill score visible de 0 a 1000', () => {
    expect(ratingToSkillScore(500)).toBe(0);
    expect(ratingToSkillScore(1000)).toBe(400);
    expect(ratingToSkillScore(2200)).toBe(1000);
  });

  it('siembra el rating inicial desde la categoría autodeclarada', () => {
    expect(getInitialRatingForCategory('8va')).toBeLessThan(getInitialRatingForCategory('5ta'));
    expect(getInitialRatingForCategory('1ra')).toBeGreaterThan(getInitialRatingForCategory('2da'));
  });

  it('devuelve 0 de delta cuando ambos equipos tienen el mismo rating y empatan expectativa/resultado', () => {
    expect(computeEloDelta(1000, 1000, 0.5)).toBe(0);
  });

  it('premia una victoria contra rivales de mayor rating', () => {
    const delta = computeEloDelta(1000, 1100, 1);
    expect(delta).toBeGreaterThan(0);
    expect(expectedScore(1000, 1100)).toBeLessThan(0.5);
  });

  it('penaliza una derrota contra rivales de menor rating', () => {
    expect(computeEloDelta(1100, 1000, 0)).toBeLessThan(0);
  });
});
