import { layoutGalaxy } from './galaxy';

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

  it('keepsTheClearCircleFree', () => {
    const readers = Array.from({ length: 40 }, (_, i) => ({ studentId: i + 1, books: 1 + (i % 9) }));
    const core = { x: 180, y: 300, r: 50 };
    const planets = layoutGalaxy(readers, 360, 640, 4, 0.32, core);
    expect(planets.length).toBe(40);
    expect(planets.every(p => Math.hypot(p.x - core.x, p.y - core.y) >= core.r + p.r)).toBe(true);
  });
});
