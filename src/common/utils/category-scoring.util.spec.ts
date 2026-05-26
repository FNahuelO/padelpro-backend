import {
  COMPETITIVE_BASE_POINTS,
  computeCompetitiveMatchPoints,
} from './category-scoring.util';

describe('computeCompetitiveMatchPoints — victoria', () => {
  it('otorga X puntos contra rivales de la misma categoría', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['5ta', '5ta'], 'win')).toBe(
      COMPETITIVE_BASE_POINTS,
    );
  });

  it('suma menos puntos contra rivales de categoría inferior', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['6ta', '6ta'], 'win')).toBe(15);
  });

  it('suma más puntos contra rivales de categoría superior', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['4ta', '4ta'], 'win')).toBe(25);
  });

  it('no baja del mínimo en victoria fácil', () => {
    expect(computeCompetitiveMatchPoints('1ra', ['7ma', '7ma'], 'win')).toBe(5);
  });
});

describe('computeCompetitiveMatchPoints — derrota', () => {
  it('resta X puntos contra rivales de la misma categoría', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['5ta', '5ta'], 'loss')).toBe(
      -COMPETITIVE_BASE_POINTS,
    );
  });

  it('pierde más puntos contra rivales de categoría inferior', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['6ta', '6ta'], 'loss')).toBe(-25);
  });

  it('pierde menos puntos contra rivales de categoría superior', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['4ta', '4ta'], 'loss')).toBe(-15);
  });
});

describe('computeCompetitiveMatchPoints — empate', () => {
  it('no modifica puntos', () => {
    expect(computeCompetitiveMatchPoints('5ta', ['4ta', '6ta'], 'draw')).toBe(0);
  });
});
