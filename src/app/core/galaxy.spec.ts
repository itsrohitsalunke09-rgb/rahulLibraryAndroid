import { orbitLayout, planetHue, planetName, planetTiers } from './galaxy';

describe('planetTiers', () => {
  it('givesBodiesByBookCountTheMostIsTheSun', () => {
    const tiers = planetTiers([{ studentId: 1, books: 24 }, { studentId: 2, books: 20 }, { studentId: 3, books: 20 }, { studentId: 4, books: 3 }]);
    expect(tiers.get(1)).toBe('sun');
    expect(tiers.get(2)).toBe('jupiter');
    expect(tiers.get(3)).toBe('jupiter');
    expect(tiers.get(4)).toBe('saturn');
    expect(planetName('saturn')).toBe('Saturn');
  });

  it('paintsReadersBelowTheFourteenthCountInTheirOwnColour', () => {
    const readers = Array.from({ length: 20 }, (_, i) => ({ studentId: i + 1, books: 40 - i }));
    const tiers = planetTiers(readers);
    expect(tiers.get(14)).toBe('ceres');
    expect(tiers.get(15)).toBe('other');
    expect(planetName('other')).toBe('');
    expect(planetHue(15)).toBe(planetHue(15));
    expect(planetHue(15)).toBeGreaterThanOrEqual(0);
    expect(planetHue(15)).toBeLessThan(360);
  });
});

describe('orbitLayout', () => {
  it('putsTheTopReaderInTheMiddleAndBusierReadersCloser', () => {
    const readers = Array.from({ length: 30 }, (_, i) => ({ studentId: i + 1, books: 30 - i }));
    const orbits = orbitLayout(readers);
    const of = (id: number) => orbits.find(o => o.studentId === id)!;
    expect(of(1).distance).toBe(0);
    expect(of(2).distance).toBeLessThan(of(30).distance);
    expect(of(2).radius).toBeGreaterThan(of(30).radius);
    expect(of(2).speed).toBeGreaterThan(of(30).speed);
    expect(orbitLayout(readers)).toEqual(orbits);
  });
});
