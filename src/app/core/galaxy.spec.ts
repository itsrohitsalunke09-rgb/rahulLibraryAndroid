import { clampView, layoutGalaxy, planetHue, planetName, planetTiers, zoomAt } from './galaxy';

describe('layoutGalaxy', () => {
  function check(count: number, width: number, height: number) {
    const readers = Array.from({ length: count }, (_, i) => ({ studentId: i + 1, books: 1 + ((i * 7) % 24) }));
    const planets = layoutGalaxy(readers, width, height);
    expect(planets.length).toBe(count);
    for (const p of planets) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(0);
      expect(p.y - p.r).toBeGreaterThanOrEqual(0);
      expect(p.x + p.r).toBeLessThanOrEqual(width);
      expect(p.y + p.r).toBeLessThanOrEqual(height);
    }
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const [a, b] = [planets[i], planets[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r);
      }
    }
    return { readers, planets };
  }

  it('fitsAFewStudentsOnAPhoneWithoutOverlap', () => {
    const { readers, planets } = check(12, 360, 640);
    const radius = (id: number) => planets.find(p => p.studentId === id)!.r;
    const most = readers.reduce((a, b) => (b.books > a.books ? b : a));
    const least = readers.reduce((a, b) => (b.books < a.books ? b : a));
    expect(radius(most.studentId)).toBeGreaterThan(radius(least.studentId));
  });

  it('fitsTwoHundredStudentsOnOneScreen', () => {
    check(200, 360, 640);
  });

  it('isTheSameEveryTime', () => {
    const readers = [{ studentId: 3, books: 5 }, { studentId: 9, books: 2 }];
    expect(layoutGalaxy(readers, 360, 640)).toEqual(layoutGalaxy(readers, 360, 640));
    expect(layoutGalaxy([], 360, 640)).toEqual([]);
  });

  it('pinsAStudentAtTheirSpot', () => {
    const readers = Array.from({ length: 40 }, (_, i) => ({ studentId: i + 1, books: 40 - i }));
    const planets = layoutGalaxy(readers, 360, 640, 4, 0.32, { studentId: 1, x: 180, y: 300 });
    expect(planets.length).toBe(40);
    const sun = planets.find(p => p.studentId === 1)!;
    expect([Math.round(sun.x), Math.round(sun.y)]).toEqual([180, 300]);
  });
});

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

describe('galaxy zoom', () => {
  it('zoomsAroundThePointAndKeepsItStill', () => {
    const v = zoomAt({ scale: 1, x: 0, y: 0 }, 2, 100, 200, 360, 640);
    expect(v).toEqual({ scale: 2, x: -100, y: -200 });
    // The point under the fingers is the same spot of the galaxy before and after.
    expect((100 - v.x) / v.scale).toBe(100);
  });

  it('staysBetweenWholeAndFourTimesAndCoversTheScreen', () => {
    expect(zoomAt({ scale: 3, x: -500, y: -900 }, 3, 0, 0, 360, 640).scale).toBe(4);
    expect(zoomAt({ scale: 1.5, x: -100, y: -100 }, 0.1, 0, 0, 360, 640)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(clampView({ scale: 2, x: 50, y: -2000 }, 360, 640)).toEqual({ scale: 2, x: 0, y: -640 });
  });
});
