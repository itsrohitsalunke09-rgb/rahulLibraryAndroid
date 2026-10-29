/** Repeatable random numbers in [0, 1) (mulberry32), so the sky looks the same on every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roughly bell-shaped spread in about -1..1, for stars bunching along a spiral arm. */
function spread(random: () => number): number {
  return (random() + random() + random() - 1.5) / 1.5;
}

/** Faint coloured gas clouds near the edges: [x, y, radius] as shares of the box, and colour. */
const NEBULAE: [number, number, number, string][] = [
  [0.12, 0.18, 0.6, '110, 50, 160'],
  [0.92, 0.86, 0.65, '30, 70, 170'],
  [0.86, 0.14, 0.38, '170, 50, 110'],
  [0.08, 0.92, 0.45, '40, 120, 150'],
];

/**
 * Paints deep space onto the canvas: background stars, nebulae, and a tilted two-armed spiral galaxy
 * with a glowing core, made of a few thousand small stars. Drawn once per size; the planets float on top.
 */
export function paintGalaxySky(canvas: HTMLCanvasElement, width: number, height: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx || width < 10 || height < 10) {
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const random = seeded(20261029);
  const glow = (x: number, y: number, r: number, stops: [number, string][]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([at, colour]) => g.addColorStop(at, colour));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  ctx.fillStyle = '#020309';
  ctx.fillRect(0, 0, width, height);
  const side = Math.max(width, height);
  for (const [x, y, r, rgb] of NEBULAE) {
    glow(x * width, y * height, r * side, [[0, `rgba(${rgb}, 0.32)`], [0.5, `rgba(${rgb}, 0.12)`], [1, `rgba(${rgb}, 0)`]]);
  }

  // Background stars: mostly faint pinpricks, a few brighter ones with a little glow.
  const tints = ['255, 255, 255', '200, 215, 255', '255, 236, 210', '255, 210, 200'];
  for (let i = 0; i < (width * height) / 700; i++) {
    const x = random() * width;
    const y = random() * height;
    const bright = random() > 0.94;
    const tint = tints[Math.floor(random() * tints.length)];
    if (bright) {
      glow(x, y, 4, [[0, `rgba(${tint}, 0.9)`], [0.4, `rgba(${tint}, 0.25)`], [1, `rgba(${tint}, 0)`]]);
    }
    ctx.fillStyle = `rgba(${tint}, ${bright ? 1 : 0.25 + random() * 0.5})`;
    ctx.fillRect(x, y, bright ? 1.4 : 0.8, bright ? 1.4 : 0.8);
  }

  // The galaxy: a disc tilted towards us (squashed and turned), centred a little above the middle.
  ctx.save();
  ctx.translate(width / 2, height * 0.46);
  ctx.rotate(-0.42);
  ctx.scale(1, 0.46);
  const R = Math.min(width * 0.62, height * 0.95);
  glow(0, 0, R, [[0, 'rgba(255, 238, 215, 0.55)'], [0.08, 'rgba(255, 210, 170, 0.32)'], [0.35, 'rgba(170, 160, 255, 0.10)'], [1, 'rgba(120, 130, 255, 0)']]);
  // Two spiral arms of small stars: warm near the core, blue further out, spreading wider as they go.
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 2400; i++) {
      const t = Math.pow(random(), 0.8);
      const angle = arm * Math.PI + t * 3.3 * Math.PI;
      const radius = R * (0.05 + 0.92 * t);
      const armWidth = (0.04 + 0.2 * t) * R;
      const x = Math.cos(angle) * radius + spread(random) * armWidth;
      const y = Math.sin(angle) * radius + spread(random) * armWidth;
      const warm = 1 - t;
      const r = Math.round(170 + 85 * warm);
      const g = Math.round(190 + 35 * warm);
      const b = Math.round(255 - 70 * warm);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + random() * 0.6 * (1 - t * 0.4)})`;
      const size = 0.8 + random() * 1.5;
      ctx.fillRect(x, y, size, size);
      // Now and then a pink star-forming cloud along the arm.
      if (random() > 0.985) {
        glow(x, y, 6 + random() * 6, [[0, 'rgba(255, 120, 170, 0.35)'], [1, 'rgba(255, 120, 170, 0)']]);
      }
    }
  }
  // Scattered stars in the disc between the arms.
  for (let i = 0; i < 1400; i++) {
    const angle = random() * Math.PI * 2;
    const radius = R * Math.pow(random(), 1.6);
    ctx.fillStyle = `rgba(255, 235, 215, ${0.08 + random() * 0.3})`;
    ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.8, 0.8);
  }
  // The bright core.
  glow(0, 0, R * 0.16, [[0, 'rgba(255, 255, 245, 0.95)'], [0.3, 'rgba(255, 230, 190, 0.6)'], [1, 'rgba(255, 200, 150, 0)']]);
  ctx.restore();
}
