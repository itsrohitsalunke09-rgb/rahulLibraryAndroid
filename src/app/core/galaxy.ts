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
