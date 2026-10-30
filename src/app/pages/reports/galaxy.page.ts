import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController, ViewDidLeave, ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { PLANET_GUIDE, planetHue, planetTiers } from '../../core/galaxy';
import { GalaxyReadersStore } from '../../core/galaxy-readers.store';
import { ReaderCount } from '../../core/models';
import type { Galaxy3d } from './galaxy-3d';
import { ReaderProfileModal } from './reader-profile.modal';

/**
 * Reading Galaxy, in 3D (Three.js, its own lazy chunk): a spiral galaxy with each student who read this
 * year as a body of the solar system, by book count: the most books is the Sun at the core, the next
 * counts Jupiter … Ceres, and readers below those plain planets in their own colour; sized by books read.
 * Drag to turn, pinch to zoom; a tap opens the student's reading profile; the guide explains the bodies.
 * When a student opens it, their own body twinkles like a star and only their own profile opens.
 */
@Component({
  selector: 'app-galaxy',
  templateUrl: 'galaxy.page.html',
  styleUrls: ['planets.scss', 'galaxy.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
})
export class GalaxyPage implements ViewWillEnter, ViewDidLeave, OnDestroy {
  private modals = inject(ModalController);
  private threeHost = viewChild.required<ElementRef<HTMLElement>>('three');

  private store = inject(GalaxyReadersStore);
  private auth = inject(AuthService);
  /** The student looking, whose body twinkles; staff have none. */
  readonly meId = this.auth.isStaff() ? undefined : this.auth.user()?.id;
  /** Opened from the Reading Galaxy tab (no back button) rather than from My books or the Books report. */
  readonly asTab = inject(Router).url.startsWith('/tabs/galaxy');
  readonly year = this.store.year;
  /** Shown at once from the copy saved on the phone, then refreshed. */
  readonly readers = this.store.readers;
  readonly error = this.store.error;
  /** The planet guide (which body means what) is open. */
  readonly guideOpen = signal(false);
  readonly guide = PLANET_GUIDE;
  /** Each student's body for the year, by rank. */
  readonly tiers = computed(() => planetTiers(this.readers() ?? []));

  /** The 3D view is drawing. */
  readonly shown = signal(false);
  /** This phone can't draw 3D (no WebGL), or the 3D view failed to load. */
  readonly unsupported = signal(false);
  private galaxy3d?: Galaxy3d;
  /** The readers drawn, so a refresh with the same counts doesn't redraw. */
  private drawn = '';
  private visible = false;
  /** Bumped by each start and stop, so a slower earlier start gives way. */
  private run = 0;

  constructor() {
    // The saved copy, then the server's: draw again only when the counts changed.
    effect(() => {
      const readers = this.readers();
      untracked(() => {
        if (this.visible && JSON.stringify(readers) !== this.drawn) {
          this.stop3d();
          void this.show3d();
        }
      });
    });
  }

  ionViewWillEnter() {
    this.visible = true;
    this.store.refresh();
    void this.show3d();
  }

  /** Leaving the screen stops the 3D view, so it doesn't use the battery in the background. */
  ionViewDidLeave() {
    this.visible = false;
    this.stop3d();
  }

  ngOnDestroy() {
    this.stop3d();
  }

  private async show3d() {
    const readers = this.readers();
    if (this.galaxy3d || !readers?.length) {
      return;
    }
    const ticket = ++this.run;
    try {
      const m = await import('./galaxy-3d');
      if (!m.supports3d()) {
        this.unsupported.set(true);
        return;
      }
      const tiers = this.tiers();
      const bodies = readers.map(r => ({ studentId: r.studentId, books: r.books, kind: tiers.get(r.studentId) ?? 'other' as const, hue: planetHue(r.studentId) }));
      const byId = new Map(readers.map(r => [r.studentId, r]));
      const galaxy = await m.start3d(this.threeHost().nativeElement, bodies, id => {
        const reader = byId.get(id);
        if (reader) {
          void this.open(reader);
        }
      }, this.meId);
      if (ticket !== this.run) {
        // Left the screen, or newer readers started, while this one loaded.
        galaxy.dispose();
        return;
      }
      this.galaxy3d = galaxy;
      this.drawn = JSON.stringify(readers);
      this.shown.set(true);
    } catch {
      this.unsupported.set(true);
    }
  }

  private stop3d() {
    this.run++;
    this.galaxy3d?.dispose();
    this.galaxy3d = undefined;
    this.drawn = '';
    this.shown.set(false);
  }

  /** The student's reading profile, with their place among this year's readers (students see only their own). */
  async open(reader: ReaderCount) {
    if (this.meId !== undefined && reader.studentId !== this.meId) {
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
