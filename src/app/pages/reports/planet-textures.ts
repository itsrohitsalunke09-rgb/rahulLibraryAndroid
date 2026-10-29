import { PlanetKind } from '../../core/galaxy';

/** Width × height of a planet's surface map (wrapped around the sphere left to right). */
const W = 512;
const H = 256;
/** Saved here after the first drawing, so later visits load them instead of drawing again. */
const CACHE = 'reading-galaxy-3d-v1';

/** Repeatable random numbers in [0, 1), so a planet's surface is the same every time it's drawn. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Paint = (g: CanvasRenderingContext2D, random: () => number) => void;

/** Horizontal bands top to bottom, softly blended, for the gas and ice giants. */
function bands(colours: string[], wobble = 0): Paint {
  return (g, random) => {
    const step = H / colours.length;
    colours.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, i * step - 1, W, step + 2);
    });
    // Wavy edges between bands.
    for (let i = 0; i < 260 * wobble; i++) {
      g.fillStyle = colours[Math.floor(random() * colours.length)] + '55';
      g.fillRect(random() * W, random() * H, 20 + random() * 60, 2 + random() * 4);
    }
  };
}

function blobs(g: CanvasRenderingContext2D, random: () => number, colour: string, count: number, size: number) {
  g.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    g.beginPath();
    g.ellipse(random() * W, H * 0.15 + random() * H * 0.7, size * (0.4 + random()), size * (0.25 + random() * 0.6), random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
}

function craters(g: CanvasRenderingContext2D, random: () => number, dark: string, count: number) {
  for (let i = 0; i < count; i++) {
    const x = random() * W;
    const y = random() * H;
    const r = 2 + random() * 9;
    g.fillStyle = dark;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.15)';
    g.stroke();
  }
}

function fill(colour: string): Paint {
  return g => {
    g.fillStyle = colour;
    g.fillRect(0, 0, W, H);
  };
}

function caps(g: CanvasRenderingContext2D, colour: string, depth: number) {
  g.fillStyle = colour;
  g.fillRect(0, 0, W, depth);
  g.fillRect(0, H - depth, W, depth);
}

/** How each body's surface is painted. */
const PAINT: Record<PlanetKind, Paint> = {
  sun: (g, random) => {
    fill('#ffb02e')(g, random);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = random() > 0.5 ? 'rgba(255,240,170,0.35)' : 'rgba(230,90,10,0.3)';
      g.beginPath();
      g.arc(random() * W, random() * H, 1 + random() * 4, 0, Math.PI * 2);
      g.fill();
    }
  },
  mercury: (g, random) => {
    fill('#9a948c')(g, random);
    blobs(g, random, 'rgba(120,114,106,0.6)', 30, 30);
    craters(g, random, '#6f6a63', 90);
  },
  venus: (g, random) => {
    bands(['#f6e2ad', '#e9c77d', '#f2d698', '#d9b064', '#efd18f', '#e3bd6c'], 1)(g, random);
  },
  earth: (g, random) => {
    fill('#1f5fae')(g, random);
    blobs(g, random, '#3e8f45', 9, 46);
    blobs(g, random, '#8a7a4a', 6, 22);
    caps(g, '#f3f7fa', 16);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) {
      g.fillRect(random() * W, random() * H, 30 + random() * 80, 3 + random() * 6);
    }
  },
  mars: (g, random) => {
    fill('#c45a32')(g, random);
    blobs(g, random, 'rgba(120,45,25,0.55)', 14, 34);
    craters(g, random, 'rgba(110,40,20,0.6)', 40);
    caps(g, '#f1e4dc', 10);
  },
  jupiter: (g, random) => {
    bands(['#ead6b3', '#c99a6b', '#f1e2c6', '#b5774d', '#ecd9b8', '#c58f60', '#f0dfc2', '#b98058', '#e6d0ad'], 1.5)(g, random);
    g.fillStyle = '#b4533a';
    g.beginPath();
    g.ellipse(W * 0.62, H * 0.64, 26, 14, 0, 0, Math.PI * 2);
    g.fill();
  },
  saturn: (g, random) => {
    bands(['#f3e5ba', '#dcc285', '#f0dfac', '#cfb173', '#ecd8a4', '#d4b77a', '#efdeae'], 1)(g, random);
  },
  uranus: (g, random) => {
    bands(['#cdf5f8', '#a9e8ef', '#9be1ea', '#a6e6ee', '#c4f1f6'], 0.3)(g, random);
  },
  neptune: (g, random) => {
    bands(['#5d86f0', '#3a5fe0', '#4a70ea', '#2f4fcc', '#3d63e2'], 0.8)(g, random);
    g.fillStyle = '#1b2c86';
    g.beginPath();
    g.ellipse(W * 0.4, H * 0.58, 22, 11, 0, 0, Math.PI * 2);
    g.fill();
  },
  pluto: (g, random) => {
    fill('#b08a64')(g, random);
    blobs(g, random, 'rgba(90,60,40,0.5)', 10, 30);
    g.fillStyle = '#f4e6cf';
    g.beginPath();
    g.ellipse(W * 0.55, H * 0.58, 40, 30, 0, 0, Math.PI * 2);
    g.fill();
  },
  eris: (g, random) => {
    fill('#dcdde6')(g, random);
    craters(g, random, 'rgba(160,160,175,0.6)', 30);
  },
  haumea: (g, random) => {
    fill('#cfc6b8')(g, random);
    blobs(g, random, '#b5584a', 1, 26);
  },
  makemake: (g, random) => {
    fill('#b8693f')(g, random);
    blobs(g, random, 'rgba(110,55,30,0.55)', 12, 26);
  },
  ceres: (g, random) => {
    fill('#7a7772')(g, random);
    craters(g, random, '#55534f', 70);
    g.fillStyle = '#f7f7f4';
    g.beginPath();
    g.arc(W * 0.6, H * 0.4, 4, 0, Math.PI * 2);
    g.fill();
  },
  // Light and neutral: the student's own colour is mixed in by the material.
  other: (g, random) => {
    bands(['#f2f2f2', '#dedede', '#ececec', '#d4d4d4', '#ebebeb'], 0.6)(g, random);
  },
};

/** Draws a body's surface map. */
export function paintPlanet(kind: PlanetKind): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  PAINT[kind](canvas.getContext('2d')!, seeded(kind.length * 7919 + kind.charCodeAt(0)));
  return canvas;
}

/**
 * Every body's surface map, read from the phone's cache when saved before; otherwise drawn now and saved
 * for next time. Falls back to just drawing when the cache isn't available.
 */
export async function loadPlanetMaps(kinds: PlanetKind[]): Promise<Map<PlanetKind, CanvasImageSource>> {
  const cache = 'caches' in globalThis ? await caches.open(CACHE).catch(() => null) : null;
  const maps = new Map<PlanetKind, CanvasImageSource>();
  await Promise.all(kinds.map(async kind => {
    const url = `/reading-galaxy/${kind}.png`;
    const saved = await cache?.match(url).catch(() => undefined);
    if (saved) {
      maps.set(kind, await createImageBitmap(await saved.blob()));
      return;
    }
    const canvas = paintPlanet(kind);
    maps.set(kind, canvas);
    const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/png'));
    if (blob) {
      await cache?.put(url, new Response(blob, { headers: { 'Content-Type': 'image/png' } })).catch(() => undefined);
    }
  }));
  return maps;
}

/** Saturn's rings: light and dark rings with gaps, from the inner edge (left) to the outer (right). */
export function paintRings(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const g = canvas.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  [[0, 'rgba(200,180,140,0.0)'], [0.08, 'rgba(210,190,150,0.55)'], [0.3, 'rgba(230,212,170,0.85)'], [0.42, 'rgba(120,100,70,0.15)'],
    [0.47, 'rgba(225,205,160,0.8)'], [0.75, 'rgba(200,178,135,0.6)'], [0.9, 'rgba(180,160,120,0.35)'], [1, 'rgba(160,140,100,0)']]
    .forEach(([at, c]) => grad.addColorStop(at as number, c as string));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1);
  return canvas;
}

/** A soft round glow (the Sun's light, the galaxy's core, round star points). */
export function paintGlow(inner: string, outer: string, size = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}
