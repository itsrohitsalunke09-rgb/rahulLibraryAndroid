import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { PLANET_GUIDE, floatTiming, layoutGalaxy, planetHue, planetName, planetTiers } from '../../core/galaxy';
import { paintGalaxySky } from '../../core/galaxy-sky';
import { ReaderCount } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { ReaderProfileModal } from './reader-profile.modal';

/** Planets this big (radius, px) or bigger carry their body's name (Sun, Jupiter …). */
const NAME_FROM_R = 28;

/**
 * Reading Galaxy: deep space with a spiral galaxy, and each student who read this year as a body of the
 * solar system floating in it, by book count: the most books is the Sun at the galaxy's core, the next
 * counts Jupiter … Ceres, and readers below those plain planets in their own colour; sized by books read. All fit on one screen; the bigger ones carry the body's name;
 * a tap opens the student's reading profile; the guide explains the bodies.
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

  /** The student's reading profile, with their place among this year's readers. */
  async open(reader: ReaderCount) {
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
