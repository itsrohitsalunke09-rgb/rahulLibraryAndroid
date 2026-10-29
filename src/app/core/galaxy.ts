/** A student's planet: centre and radius in px inside the galaxy box. */
export interface Planet {
  studentId: number;
  x: number;
  y: number;
  r: number;
}

/** Smallest planet radius, so ~200 students still show as tappable dots. */
const MIN_R = 9;
/** Random spots tried per planet before the whole galaxy is shrunk and laid out again. */
const TRIES = 1600;

/** A steady number from an id, so each student keeps their place between visits. */
function hash(id: number): number {
  return Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
}

/** Repeatable random numbers in [0, 1) from a seed (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Places every student as a non-overlapping planet inside a width × height box (one screen, no
 * scrolling). Area grows with books read. Each planet lands on a random spot anywhere in the box (the
 * same spot every visit); the biggest are placed first so the small ones fill the gaps around them.
 * If a planet can't fit, everything shrinks a little and is placed again. keepClear is a circle (px)
 * no planet may cover, e.g. the bright core of the painted galaxy.
 */
export function layoutGalaxy(readers: { studentId: number; books: number }[], width: number, height: number, gap = 4,
                             maxFill = 0.5, keepClear?: { x: number; y: number; r: number }): Planet[] {
  if (!readers.length || width < 40 || height < 40) {
    return [];
  }
  const total = readers.reduce((sum, r) => sum + Math.max(r.books, 1), 0);
  const sorted = [...readers].sort((a, b) => b.books - a.books || a.studentId - b.studentId);
  // Start with the planets covering maxFill of the box (half by default); shrink until they all fit.
  for (let fill = maxFill; fill > 0.02; fill *= 0.85) {
    const k = Math.sqrt((fill * width * height) / (Math.PI * total));
    const placed: Planet[] = [];
    // Planets filed by the grid cells their square covers, so a spot is checked only against neighbours.
    const cells = new Map<number, Planet[]>();
    const CELL = 32;
    const cols = Math.ceil(width / CELL) + 1;
    const around = (x: number, y: number, reach: number, visit: (key: number) => boolean | void) => {
      for (let gx = Math.max(0, Math.floor((x - reach) / CELL)); gx <= Math.floor((x + reach) / CELL); gx++) {
        for (let gy = Math.max(0, Math.floor((y - reach) / CELL)); gy <= Math.floor((y + reach) / CELL); gy++) {
          if (visit(gy * cols + gx) === false) {
            return false;
          }
        }
      }
      return true;
    };
    const free = (x: number, y: number, r: number) => around(x, y, r + gap, key =>
      (cells.get(key) ?? []).every(p => (p.x - x) ** 2 + (p.y - y) ** 2 >= (p.r + r + gap) ** 2));
    const fits = sorted.every(reader => {
      const r = Math.min(Math.max(MIN_R, k * Math.sqrt(Math.max(reader.books, 1))), Math.min(width, height) / 2 - gap);
      const random = seeded(hash(reader.studentId));
      for (let i = 0; i < TRIES; i++) {
        const x = r + random() * (width - 2 * r);
        const y = r + random() * (height - 2 * r);
        const clear = !keepClear || (keepClear.x - x) ** 2 + (keepClear.y - y) ** 2 >= (keepClear.r + r) ** 2;
        if (clear && free(x, y, r)) {
          const planet = { studentId: reader.studentId, x, y, r };
          placed.push(planet);
          around(x, y, r, key => void cells.set(key, [...(cells.get(key) ?? []), planet]));
          return true;
        }
      }
      return false;
    });
    if (fits) {
      return placed;
    }
  }
  return [];
}

/** How long a planet takes to bob up and down, and where in that it starts, so they don't move together. */
export function floatTiming(studentId: number): { duration: number; delay: number } {
  const h = hash(studentId);
  return { duration: 5 + (h % 40) / 10, delay: -((h >> 8) % 60) / 10 };
}

/** The solar system's planets; each student is always drawn as the same one. */
const KINDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
export type PlanetKind = (typeof KINDS)[number];

export function planetKind(studentId: number): PlanetKind {
  return KINDS[hash(studentId) % KINDS.length];
}
