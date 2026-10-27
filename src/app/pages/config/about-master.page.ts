import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar
} from '@ionic/angular';
import { AboutContent, DEFAULT_ABOUT, withDefaults } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { UiService, errorMessage } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';

/** Configuration → About us page: edit the text of the About Us page (opened from the login screen). */
@Component({
  selector: 'app-about-master',
  templateUrl: 'about-master.page.html',
  styleUrls: ['about-master.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonContent, IonSpinner, PageSkeletonComponent],
})
export class AboutMasterPage implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);

  /** A copy being edited; the arrays are copied too, so Add/Remove don't touch DEFAULT_ABOUT. */
  form: AboutContent = copy(DEFAULT_ABOUT);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit() {
    this.api.about().subscribe({
      next: saved => {
        this.form = copy(withDefaults(saved));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not load the saved text; showing the built-in text.'));
      }
    });
  }

  addStep() {
    this.form.timeline.push({ year: '', text: '' });
  }

  removeStep(index: number) {
    this.form.timeline.splice(index, 1);
  }

  addSection() {
    this.form.sections.push({ heading: '', body: '' });
  }

  removeSection(index: number) {
    this.form.sections.splice(index, 1);
  }

  /** Moves a section one place up (-1) or down (+1). */
  moveSection(index: number, step: number) {
    const to = index + step;
    if (to >= 0 && to < this.form.sections.length) {
      const [section] = this.form.sections.splice(index, 1);
      this.form.sections.splice(to, 0, section);
    }
  }

  save() {
    const f = this.form;
    const content: AboutContent = {
      title: f.title.trim(),
      motto: f.motto.trim(),
      tagline: f.tagline.trim(),
      intro: f.intro.trim(),
      // Blank rows are left out rather than shown as empty lines.
      timeline: f.timeline.map(s => ({ year: s.year.trim(), text: s.text.trim() })).filter(s => s.year || s.text),
      sections: f.sections.map(s => ({ heading: s.heading.trim(), body: s.body.trim() })).filter(s => s.heading || s.body),
      address: f.address.trim(),
      email: f.email.trim(),
      instagram: f.instagram.trim(),
    };
    if (!content.title) {
      this.error.set('Enter the library name (title).');
      return;
    }
    if (content.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email)) {
      this.error.set('Enter a valid email address, or leave it empty.');
      return;
    }
    if (content.instagram && !/^https:\/\//.test(content.instagram)) {
      this.error.set('The Instagram link must start with https://');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.saveAbout(content).subscribe({
      next: () => {
        this.saving.set(false);
        this.form = copy(content);
        this.ui.toast('About us page saved.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the About us page.'));
      }
    });
  }

  /** Puts back the text the app shipped with (not saved until Save). */
  async restoreDefault() {
    if (await this.ui.confirm('Use the original text?', 'The form is filled with the text the app came with. Nothing changes until you tap Save.', 'Use original')) {
      this.form = copy(DEFAULT_ABOUT);
      this.error.set('');
    }
  }
}

function copy(c: AboutContent): AboutContent {
  return { ...c, timeline: c.timeline.map(s => ({ ...s })), sections: c.sections.map(s => ({ ...s })) };
}
