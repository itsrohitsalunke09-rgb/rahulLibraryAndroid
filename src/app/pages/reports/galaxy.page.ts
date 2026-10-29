import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { floatTiming, layoutGalaxy, planetKind } from '../../core/galaxy';
import { paintGalaxySky } from '../../core/galaxy-sky';
import { ReaderCount } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { ReaderProfileModal } from './reader-profile.modal';

/** Planets this big (radius, px) or bigger carry the student's name. */
const NAME_FROM_R = 28;

/**
 * Reading Galaxy: deep space with a spiral galaxy, and each student who read this year as a planet
 * (Mercury … Neptune) floating in it, its size by books read. All of them fit on one screen; names show inside the bigger planets; a tap opens the student's
 * reading profile.
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

  /** Each planet with what the template needs: place, colour, float timing, and the name when it fits. */
  readonly planets = computed(() => {
    const readers = this.readers() ?? [];
    const { width, height } = this.box();
    const byId = new Map(readers.map(r => [r.studentId, r]));
    // About a third of the sky, so the spiral galaxy shows between the planets; its core stays uncovered.
    const core = { x: width / 2, y: height * 0.46, r: Math.min(width, height) * 0.12 };
    return layoutGalaxy(readers, width, height, 4, 0.32, core).map(p => {
      const reader = byId.get(p.studentId)!;
      return { ...p, reader, kind: planetKind(p.studentId), named: p.r >= NAME_FROM_R, ...floatTiming(p.studentId) };
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
      componentProps: { reader, rank: list.findIndex(r => r.studentId === reader.studentId) + 1, readers: list.length, year: this.year },
    });
    await modal.present();
  }
}
