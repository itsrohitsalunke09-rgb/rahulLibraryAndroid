import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import {
  GalaxyView, MAX_ZOOM, PLANET_GUIDE, clampView, floatTiming, layoutGalaxy, planetHue, planetName, planetTiers, zoomAt,
} from '../../core/galaxy';
import { paintGalaxySky } from '../../core/galaxy-sky';
import { ReaderCount } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { ReaderProfileModal } from './reader-profile.modal';

/** Planets this big (radius, px) or bigger carry their body's name (Sun, Jupiter …). */
const NAME_FROM_R = 28;
/** A finger moving more than this (px) is a drag, not a tap. */
const DRAG = 8;

/**
 * Reading Galaxy: deep space with a spiral galaxy, and each student who read this year as a body of the
 * solar system floating in it, by book count: the most books is the Sun at the galaxy's core, the next
 * counts Jupiter … Ceres, and readers below those plain planets in their own colour; sized by books read.
 * All fit on one screen and can be zoomed (pinch, drag, wheel, double-tap or the buttons); the bigger ones
 * carry the body's name; a tap opens the student's reading profile; the guide explains the bodies.
 */
@Component({
  selector: 'app-galaxy',
  templateUrl: 'galaxy.page.html',
  styleUrls: ['planets.scss', 'galaxy.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
})
export class GalaxyPage implements ViewWillEnter, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private sky = viewChild.required<ElementRef<HTMLElement>>('sky');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('space');
  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private resize?: ResizeObserver;

  readonly year = new Date().getFullYear();
  readonly readers = signal<ReaderCount[] | null>(null);
  readonly error = signal('');
  private readonly box = signal({ width: 0, height: 0 });
  /** The planet guide (which body means what) is open. */
  readonly guideOpen = signal(false);
  readonly guide = PLANET_GUIDE;
  readonly planetName = planetName;
  /** Each student's body for the year, by rank. */
  readonly tiers = computed(() => planetTiers(this.readers() ?? []));

  /** Zoom and position; the world (sky and planets) is scaled and moved as one. */
  readonly view = signal<GalaxyView>({ scale: 1, x: 0, y: 0 });
  readonly transform = computed(() => {
    const v = this.view();
    return `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  });
  readonly maxZoom = MAX_ZOOM;
  /** Fingers (or the mouse) on the galaxy, by pointer id, in viewport px. */
  private pointers = new Map<number, { x: number; y: number }>();
  /** How far the current gesture has moved, so a drag doesn't count as a tap. */
  private moved = 0;
  private lastTap = 0;

  /** Each planet with what the template needs: place, colour, float timing, and the name when it fits. */
  readonly planets = computed(() => {
    const readers = this.readers() ?? [];
    const { width, height } = this.box();
    const byId = new Map(readers.map(r => [r.studentId, r]));
    const tiers = this.tiers();
    // About a third of the sky, so the spiral galaxy shows between the planets. The top reader, the Sun,
    // sits on the painted galaxy's core (46% down the screen; the sky box is inset 8px, 34px at the bottom).
    const top = [...readers].sort((a, b) => b.books - a.books)[0];
    const core = top && { studentId: top.studentId, x: width / 2, y: (height + 42) * 0.46 - 8 };
    return layoutGalaxy(readers, width, height, 4, 0.32, core).map(p => {
      const reader = byId.get(p.studentId)!;
      return { ...p, reader, kind: tiers.get(p.studentId) ?? 'other', hue: planetHue(p.studentId), named: p.r >= NAME_FROM_R, ...floatTiming(p.studentId) };
    });
  });

  ionViewWillEnter() {
    this.api.readersInYear(this.year).subscribe({
      next: list => { this.readers.set(list); this.error.set(''); },
      error: err => this.error.set(errorMessage(err, 'Could not load this year’s readers.')),
    });
  }

  ngAfterViewInit() {
    const el = this.sky().nativeElement;
    const canvas = this.canvas().nativeElement;
    this.resize = new ResizeObserver(() => {
      this.box.set({ width: el.clientWidth, height: el.clientHeight });
      paintGalaxySky(canvas, canvas.clientWidth, canvas.clientHeight);
    });
    this.resize.observe(el);
  }

  ngOnDestroy() {
    this.resize?.disconnect();
  }

  zoomBy(factor: number) {
    const [w, h] = this.size();
    this.view.set(zoomAt(this.view(), factor, w / 2, h / 2, w, h));
  }

  reset() {
    this.view.set({ scale: 1, x: 0, y: 0 });
  }

  down(e: PointerEvent) {
    this.pointers.set(e.pointerId, this.local(e));
    if (this.pointers.size === 1) {
      this.moved = 0;
    }
  }

  /** One finger drags a zoomed galaxy; two fingers pinch (zoom around their middle) and drag together. */
  move(e: PointerEvent) {
    const before = this.pointers.get(e.pointerId);
    if (!before) {
      return;
    }
    const now = this.local(e);
    const [w, h] = this.size();
    if (this.pointers.size === 2) {
      const other = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)![1];
      const factor = Math.hypot(now.x - other.x, now.y - other.y) / Math.max(Math.hypot(before.x - other.x, before.y - other.y), 1);
      const mid = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
      const shifted = { ...this.view(), x: this.view().x + (now.x - before.x) / 2, y: this.view().y + (now.y - before.y) / 2 };
      this.view.set(zoomAt(shifted, factor, mid.x, mid.y, w, h));
    } else if (this.view().scale > 1) {
      const v = this.view();
      this.view.set(clampView({ ...v, x: v.x + now.x - before.x, y: v.y + now.y - before.y }, w, h));
    }
    this.moved += Math.hypot(now.x - before.x, now.y - before.y);
    this.pointers.set(e.pointerId, now);
  }

  /** A quick second tap on empty sky zooms in there, or back out when zoomed. */
  up(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (e.type !== 'pointerup' || this.moved > DRAG || (e.target as HTMLElement).closest('.planet')) {
      return;
    }
    if (e.timeStamp - this.lastTap < 320) {
      const { x, y } = this.local(e);
      const [w, h] = this.size();
      this.view.set(this.view().scale > 1 ? { scale: 1, x: 0, y: 0 } : zoomAt(this.view(), 2.5, x, y, w, h));
      this.lastTap = 0;
    } else {
      this.lastTap = e.timeStamp;
    }
  }

  wheel(e: WheelEvent) {
    e.preventDefault();
    const { x, y } = this.local(e);
    const [w, h] = this.size();
    this.view.set(zoomAt(this.view(), e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y, w, h));
  }

  private local(e: { clientX: number; clientY: number }) {
    const box = this.viewport().nativeElement.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  private size(): [number, number] {
    const el = this.viewport().nativeElement;
    return [el.clientWidth, el.clientHeight];
  }

  /** The student's reading profile, with their place among this year's readers (not after a drag). */
  async open(reader: ReaderCount) {
    if (this.moved > DRAG) {
      return;
    }
    const list = this.readers() ?? [];
    const modal = await this.modals.create({
      component: ReaderProfileModal,
      componentProps: {
        reader, rank: list.findIndex(r => r.studentId === reader.studentId) + 1, readers: list.length, year: this.year,
        kind: this.tiers().get(reader.studentId) ?? 'other',
      },
    });
    await modal.present();
  }
}
