/** A student's planet: centre and radius in px inside the galaxy box. */
export interface Planet {
  studentId: number;
  x: number;
  y: number;
  r: number;
}

/** Smallest planet radius, small enough that 1, 2 and 3 books still look different (zoom in to tap the tiny ones). */
const MIN_R = 6;
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
 * If a planet can't fit, everything shrinks a little and is placed again. pin puts one student's
 * planet at a set spot (the Sun at the painted galaxy's core) when it fits there.
 */
export function layoutGalaxy(readers: { studentId: number; books: number }[], width: number, height: number, gap = 4,
                             maxFill = 0.5, pin?: { studentId: number; x: number; y: number }): Planet[] {
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
      const pinned = pin?.studentId === reader.studentId;
      for (let i = 0; i < TRIES; i++) {
        // A pinned planet tries its own spot first (kept inside the box), then random ones like the rest.
        const x = pinned && i === 0 ? Math.min(Math.max(pin.x, r), width - r) : r + random() * (width - 2 * r);
        const y = pinned && i === 0 ? Math.min(Math.max(pin.y, r), height - r) : r + random() * (height - 2 * r);
        if (free(x, y, r)) {
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

/**
 * The Sun, planets and dwarf planets from biggest to smallest. They go to the year's book counts in order:
 * the most books is the Sun, the next count down is Jupiter, and so on to Ceres. Readers below those
 * fourteen counts are plain planets in their own colour.
 */
export const PLANET_GUIDE = [
  { kind: 'sun', name: 'Sun', meaning: 'Most books' },
  { kind: 'jupiter', name: 'Jupiter', meaning: '2nd most books' },
  { kind: 'saturn', name: 'Saturn', meaning: '3rd most' },
  { kind: 'uranus', name: 'Uranus', meaning: '4th most' },
  { kind: 'neptune', name: 'Neptune', meaning: '5th most' },
  { kind: 'earth', name: 'Earth', meaning: '6th most' },
  { kind: 'venus', name: 'Venus', meaning: '7th most' },
  { kind: 'mars', name: 'Mars', meaning: '8th most' },
  { kind: 'mercury', name: 'Mercury', meaning: '9th most' },
  { kind: 'pluto', name: 'Pluto', meaning: '10th most · dwarf planet' },
  { kind: 'eris', name: 'Eris', meaning: '11th most · dwarf planet' },
  { kind: 'haumea', name: 'Haumea', meaning: '12th most · dwarf planet' },
  { kind: 'makemake', name: 'Makemake', meaning: '13th most · dwarf planet' },
  { kind: 'ceres', name: 'Ceres', meaning: '14th most · dwarf planet' },
] as const;
/** A body of the solar system, or 'other' for a plain planet in the student's own colour. */
export type PlanetKind = (typeof PLANET_GUIDE)[number]['kind'] | 'other';

/**
 * Each student's body for the year by book count: the highest count is the Sun, the next Jupiter, and so
 * on; students with the same count share a body; counts below the fourteenth are 'other'.
 */
export function planetTiers(readers: { studentId: number; books: number }[]): Map<number, PlanetKind> {
  const counts = [...new Set(readers.map(r => r.books))].sort((a, b) => b - a);
  return new Map(readers.map(r => [r.studentId, PLANET_GUIDE[counts.indexOf(r.books)]?.kind ?? 'other']));
}

/** "Jupiter" for "jupiter"; empty for a plain coloured planet. */
export function planetName(kind: PlanetKind): string {
  return PLANET_GUIDE.find(t => t.kind === kind)?.name ?? '';
}

/** The colour (hue, 0–359) of a student's plain planet: random-looking but the same every visit. */
export function planetHue(studentId: number): number {
  return hash(studentId + 7919) % 360;
}

/** How far the galaxy is zoomed (1 = whole galaxy, up to 4×) and moved, in screen px. */
export interface GalaxyView {
  scale: number;
  x: number;
  y: number;
}

export const MAX_ZOOM = 4;

/** Keeps the zoomed galaxy covering the screen: no empty strip at any edge. */
export function clampView(view: GalaxyView, width: number, height: number): GalaxyView {
  const scale = Math.min(Math.max(view.scale, 1), MAX_ZOOM);
  return {
    scale,
    x: Math.min(0, Math.max(width * (1 - scale), view.x)),
    y: Math.min(0, Math.max(height * (1 - scale), view.y)),
  };
}

/** Zooms by a factor around a point on screen (a pinch's middle, the wheel's pointer), which stays put. */
export function zoomAt(view: GalaxyView, factor: number, px: number, py: number, width: number, height: number): GalaxyView {
  const scale = Math.min(Math.max(view.scale * factor, 1), MAX_ZOOM);
  const ratio = scale / view.scale;
  return clampView({ scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, width, height);
}

/** Where a student's body sits in the 3D galaxy: its orbit around the Sun, height, size and orbit speed. */
export interface Orbit3d {
  studentId: number;
  /** Distance from the Sun and starting angle (radians) on its orbit. */
  distance: number;
  angle: number;
  /** Above or below the galaxy's disc. */
  height: number;
  radius: number;
  /** Radians per second; nearer bodies go round faster, like real orbits. */
  speed: number;
}

/**
 * The 3D layout: the top reader is the Sun at the centre; everyone else orbits it, busiest readers on the
 * inner orbits, spread around the disc with a little height so the galaxy has depth. Sizes follow books.
 */
export function orbitLayout(readers: { studentId: number; books: number }[]): Orbit3d[] {
  const sorted = [...readers].sort((a, b) => b.books - a.books || a.studentId - b.studentId);
  const most = Math.max(sorted[0]?.books ?? 1, 1);
  return sorted.map((reader, i) => {
    const random = seeded(hash(reader.studentId) + 11);
    if (i === 0) {
      return { studentId: reader.studentId, distance: 0, angle: 0, height: 0, radius: 6, speed: 0 };
    }
    const distance = 16 + 90 * Math.sqrt(i / Math.max(sorted.length - 1, 1)) + random() * 4;
    return {
      studentId: reader.studentId,
      distance,
      angle: i * 2.399963 + random() * 0.6,
      height: (random() - 0.5) * (2 + distance * 0.08),
      radius: 0.45 + 2.6 * Math.sqrt(reader.books / most),
      speed: 0.6 / Math.sqrt(distance),
    };
  });
}
