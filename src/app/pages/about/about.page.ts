import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, logoInstagram, mailOutline } from 'ionicons/icons';
import { DEFAULT_ABOUT, aboutBlocks, instagramHandle, withDefaults } from '../../core/about-content';
import { ApiService } from '../../core/api.service';

/** About the library, in the login screen's look. Text comes from Configuration → About us page. */
@Component({
  selector: 'app-about',
  templateUrl: 'about.page.html',
  styleUrls: ['../login/login.page.scss', 'about.page.scss'],
  imports: [IonContent, IonIcon],
})
export class AboutPage implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);

  /** The built-in text shows at once; the saved version replaces it when it arrives. */
  readonly content = signal(DEFAULT_ABOUT);
  readonly introBlocks = computed(() => aboutBlocks(this.content().intro));
  readonly sections = computed(() => this.content().sections.map(s => ({ heading: s.heading, blocks: aboutBlocks(s.body) })));
  readonly addressLines = computed(() => this.content().address.split('\n').map(l => l.trim()).filter(Boolean));
  readonly instagramHandle = computed(() => instagramHandle(this.content().instagram));

  constructor() {
    addIcons({ arrowBack, logoInstagram, mailOutline });
  }

  ngOnInit() {
    this.api.about().subscribe({
      next: saved => {
        if (saved) {
          this.content.set(withDefaults(saved));
        }
      },
      // Offline or the server is asleep: keep showing the built-in text.
      error: () => undefined,
    });
  }

  back() {
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
