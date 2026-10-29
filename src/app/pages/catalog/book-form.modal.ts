import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CategoriesStore } from '../../core/categories.store';
import { Book } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';
import { BookFormModel, KEEP_TEXT_CATEGORY, bookFormFrom, toBookRequest, unlinkedCategory } from './book-request';

@Component({
  selector: 'app-book-form',
  templateUrl: 'book-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner],
  styles: [`.form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }`],
})
export class BookFormModal implements OnInit {
  /** Book to edit; leave empty to add a new one. */
  @Input() book?: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected categories = inject(CategoriesStore);

  form: BookFormModel = bookFormFrom();
  /** Old text category of the book being edited that is not in the master; kept selectable. */
  oldCategory = '';
  protected readonly keepText = KEEP_TEXT_CATEGORY;
  readonly saving = signal(false);
  readonly error = signal('');
  /** Publication years, newest first, back to 1800 (plus an older year already on the book). */
  years: number[] = [];

  ngOnInit() {
    this.form = bookFormFrom(this.book);
    this.years = publicationYears(new Date().getFullYear(), this.book?.publicationYear);
    this.oldCategory = unlinkedCategory(this.book);
    this.categories.load(true);
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const result = toBookRequest(this.form);
    if ('error' in result) {
      this.error.set(result.error);
      return;
    }
    const request = result.request;
    this.saving.set(true);
    this.error.set('');
    this.api.saveBook(request, this.book?.id).subscribe({
      next: saved => {
        this.ui.toast(this.book ? 'Book updated.' : 'Book added.');
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the book.'));
      }
    });
  }
}

/** The publication year choices: this year back to 1800, with a book's older year kept so it isn't lost. */
export function publicationYears(thisYear: number, current?: number | null): number[] {
  const years = Array.from({ length: thisYear - 1800 + 1 }, (_, i) => thisYear - i);
  return current && current < 1800 ? [...years, current] : years;
}
