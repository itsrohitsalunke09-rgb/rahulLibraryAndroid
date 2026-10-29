import {
  AdditiveBlending, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Points, PointsMaterial, Raycaster, RingGeometry,
  SRGBColorSpace, Scene, SphereGeometry, Sprite, SpriteMaterial, Texture, Vector2, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANET_GUIDE, PlanetKind, orbitLayout } from '../../core/galaxy';
import { loadPlanetMaps, paintGlow, paintRings } from './planet-textures';

/** One student in the 3D galaxy. */
export interface Body3d {
  studentId: number;
  books: number;
  kind: PlanetKind;
  /** The plain planet's colour (0–359), for kind 'other'. */
  hue: number;
}

export interface Galaxy3d {
  dispose(): void;
}

const ALL_KINDS = [...PLANET_GUIDE.map(g => g.kind), 'other'] as PlanetKind[];
let maps: Promise<Map<PlanetKind, CanvasImageSource>> | null = null;

/** True when this phone can draw WebGL. */
export function supports3d(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Gets the planet surface maps ready (from the phone's cache, or drawn and cached), once per app run. */
export function prepare3d(): Promise<unknown> {
  maps ??= loadPlanetMaps(ALL_KINDS);
  return maps;
}

/**
 * How far the camera starts so most planets fit across the screen; a tall phone
 * screen starts further out than a wide one.
 */
export function fitDistance(aspect: number): number {
  const across = 2 * Math.tan((55 / 2) * Math.PI / 180) * Math.max(aspect, 0.1);
  return Math.min(Math.max(100 / across, 111), 360);
}

/** Repeatable random numbers in [0, 1). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texture(source: CanvasImageSource | HTMLCanvasElement): Texture {
  const t = source instanceof HTMLCanvasElement ? new CanvasTexture(source) : new Texture(source as ImageBitmap);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** A name tag that always faces the camera. */
function label(text: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.font = '600 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 6;
  g.fillStyle = '#eef1ff';
  g.fillText(text, 128, 32);
  const sprite = new Sprite(new SpriteMaterial({ map: texture(canvas), depthWrite: false, transparent: true }));
  sprite.scale.set(11, 2.75, 1);
  return sprite;
}

/** The spiral galaxy: two arms of warm-to-blue stars around a bright core, plus a background starfield. */
function stars(scene: Scene, round: Texture) {
  const random = seeded(20261029);
  const count = 16000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.pow(random(), 0.75);
    const r = 8 + t * 170;
    const arm = i % 2;
    const spread = (random() + random() + random() - 1.5) * (3 + t * 22);
    const a = arm * Math.PI + r * 0.035 + spread * 0.02;
    pos[i * 3] = Math.cos(a) * r + spread * Math.cos(a + Math.PI / 2);
    pos[i * 3 + 1] = (random() + random() - 1) * (3.5 - t * 2.5);
    pos[i * 3 + 2] = Math.sin(a) * r + spread * Math.sin(a + Math.PI / 2);
    const warm = 1 - t;
    col[i * 3] = 0.65 + 0.35 * warm;
    col[i * 3 + 1] = 0.72 + 0.18 * warm;
    col[i * 3 + 2] = 1 - 0.3 * warm;
  }
  const disc = new BufferGeometry();
  disc.setAttribute('position', new BufferAttribute(pos, 3));
  disc.setAttribute('color', new BufferAttribute(col, 3));
  scene.add(new Points(disc, new PointsMaterial({
    size: 1.1, map: round, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.85,
  })));

  const far = new Float32Array(2500 * 3);
  for (let i = 0; i < 2500; i++) {
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    far.set([Math.cos(a) * s * 600, u * 600, Math.sin(a) * s * 600], i * 3);
  }
  const sky = new BufferGeometry();
  sky.setAttribute('position', new BufferAttribute(far, 3));
  scene.add(new Points(sky, new PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xdfe6ff, transparent: true, opacity: 0.8 })));
}

/**
 * Starts the 3D Reading Galaxy in host: the top reader is the Sun at the centre, lighting everyone; the rest
 * orbit it as textured planets and dwarf planets (sized by books), with names on the named ones. Drag to
 * turn, pinch to zoom; a tap (not a drag) on a body calls onPick with the student's id. The body of meId
 * (the student looking) twinkles like a star.
 */
export async function start3d(
  host: HTMLElement, bodies: Body3d[], onPick: (studentId: number) => void, meId?: number,
): Promise<Galaxy3d> {
  const surfaces = await prepare3d() as Map<PlanetKind, CanvasImageSource>;
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  // 1.5× is sharp on a phone and keeps frames coming during a drag (2× dropped frames).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(0x020309);
  const camera = new PerspectiveCamera(55, 1, 0.5, 2000);
  camera.position.set(0, 48, 100);
  // The host may still be hidden (no size) here; the first real size sets the starting distance.
  let fitted = false;

  const controls = new OrbitControls(camera, renderer.domElement);
  // Smooth handling: a soft glide after letting go, and a calmer drag, pinch and two-finger move
  // (one finger turns the galaxy; two fingers pinch to zoom and slide it up, down or sideways).
  controls.enableDamping = true;
  controls.dampingFactor = 0.035;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.4;
  controls.panSpeed = 0.6;
  controls.minDistance = 18;
  controls.maxDistance = 420;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;
  // The slow turn pauses while a finger is down (it fought the drag), and comes back 3 s after.
  let resumeTurn: ReturnType<typeof setTimeout> | undefined;
  const onStart = () => {
    clearTimeout(resumeTurn);
    controls.autoRotate = false;
  };
  const onEnd = () => {
    clearTimeout(resumeTurn);
    resumeTurn = setTimeout(() => controls.autoRotate = true, 3000);
  };
  controls.addEventListener('start', onStart);
  controls.addEventListener('end', onEnd);

  const round = texture(paintGlow('rgba(255,255,255,1)', 'rgba(255,255,255,0.5)', 32));
  stars(scene, round);
  const core = new Sprite(new SpriteMaterial({
    map: texture(paintGlow('rgba(255,240,215,0.9)', 'rgba(255,190,120,0.25)')), blending: AdditiveBlending, depthWrite: false,
  }));
  core.scale.set(70, 70, 1);
  scene.add(core);
  scene.add(new AmbientLight(0xffffff, 0.35));
  scene.add(new PointLight(0xfff1d6, 3, 0, 0));

  const sphere = new SphereGeometry(1, 40, 24);
  const kinds = new Map(bodies.map(b => [b.studentId, b]));
  const meshes: Mesh[] = [];
  const spinning: { group: Group; orbit: ReturnType<typeof orbitLayout>[number] }[] = [];
  const ringTexture = texture(paintRings());
  let twinkle: Sprite | null = null;

  for (const orbit of orbitLayout(bodies)) {
    const body = kinds.get(orbit.studentId)!;
    const sun = orbit.distance === 0;
    const map = texture(surfaces.get(body.kind) ?? surfaces.get('other')!);
    const material = sun || body.kind === 'sun'
      ? new MeshBasicMaterial({ map })
      : new MeshStandardMaterial({
        map, roughness: 1, metalness: 0,
        color: body.kind === 'other' ? new Color().setHSL(body.hue / 360, 0.65, 0.62) : 0xffffff,
      });
    const mesh = new Mesh(sphere, material);
    mesh.scale.setScalar(orbit.radius);
    mesh.userData['studentId'] = body.studentId;
    meshes.push(mesh);

    const group = new Group();
    group.add(mesh);
    if (sun || body.kind === 'sun') {
      const glow = new Sprite(new SpriteMaterial({
        map: texture(paintGlow('rgba(255,220,120,0.9)', 'rgba(255,140,0,0.35)')), blending: AdditiveBlending, depthWrite: false,
      }));
      glow.scale.setScalar(orbit.radius * 5);
      group.add(glow);
    }
    if (body.studentId === meId) {
      twinkle = new Sprite(new SpriteMaterial({
        map: texture(paintGlow('rgba(255,255,255,1)', 'rgba(150,200,255,0.45)')), blending: AdditiveBlending, depthWrite: false,
      }));
      group.add(twinkle);
    }
    if (body.kind === 'saturn') {
      const ring = new RingGeometry(orbit.radius * 1.35, orbit.radius * 2.3, 64);
      // Map the ring texture from the inner edge to the outer one.
      const uv = ring.attributes['uv'];
      const p = ring.attributes['position'];
      for (let i = 0; i < uv.count; i++) {
        const d = Math.hypot(p.getX(i), p.getY(i));
        uv.setXY(i, (d - orbit.radius * 1.35) / (orbit.radius * 0.95), 0.5);
      }
      const rings = new Mesh(ring, new MeshBasicMaterial({ map: ringTexture, side: DoubleSide, transparent: true, depthWrite: false }));
      rings.rotation.x = Math.PI / 2.3;
      group.add(rings);
    }
    const name = PLANET_GUIDE.find(g => g.kind === body.kind)?.name;
    if (name && orbit.radius >= 1.2) {
      const tag = label(name);
      tag.position.y = orbit.radius + 2.6;
      group.add(tag);
    }
    group.position.set(Math.cos(orbit.angle) * orbit.distance, orbit.height, Math.sin(orbit.angle) * orbit.distance);
    scene.add(group);
    spinning.push({ group, orbit });
  }

  // Taps: a press and release in nearly the same place picks the body under the finger.
  const raycaster = new Raycaster();
  let downAt: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) {
      return;
    }
    const box = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit) {
      onPick(hit.object.userData['studentId'] as number);
    }
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  const resize = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    if (!fitted && host.clientWidth && host.clientHeight) {
      camera.position.setLength(fitDistance(camera.aspect));
      fitted = true;
    }
  });
  resize.observe(host);

  // Slow orbits and spins (40% slower than first built); stops when the screen is left (dispose).
  let last = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const { group, orbit } of spinning) {
      orbit.angle += orbit.speed * dt * 0.09;
      group.position.x = Math.cos(orbit.angle) * orbit.distance;
      group.position.z = Math.sin(orbit.angle) * orbit.distance;
      group.children[0].rotation.y += dt * 0.15;
    }
    if (twinkle) {
      // Bright and dim about once a second, never fully out, so the student can find themself.
      const glow = 0.5 + 0.5 * Math.sin(now / 160);
      twinkle.material.opacity = 0.35 + 0.65 * glow;
      twinkle.scale.setScalar(Math.max(twinkle.parent!.children[0].scale.x, 1.2) * (8 + 6 * glow));
    }
    // The time step keeps the slow turn steady even when a frame is late.
    controls.update(dt);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(frame);
      clearTimeout(resumeTurn);
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      resize.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse(object => {
        const item = object as Mesh;
        item.geometry?.dispose();
        const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
        materials.forEach(m => {
          (m as MeshBasicMaterial).map?.dispose();
          m.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
