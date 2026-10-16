import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { Book, UserAccount } from '../../core/models';
import { MarathiPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';

/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY = 300;

@Component({
  selector: 'app-issue-book',
  templateUrl: 'issue-book.modal.html',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonSpinner,
    MarathiPipe
  ],
  styles: [`
    .wrap { max-width: 520px; margin: 0 auto; }
    .book-card {
      padding: 14px 16px; border-radius: var(--app-radius-sheet);
      border: 1px solid var(--app-rule); background: var(--app-surface);
      box-shadow: inset 4px 0 0 var(--ion-color-success);
    }
    .book { margin: 0 0 2px; font-size: 1.0625rem; font-weight: 700; }
    .hint { color: var(--ion-color-medium); margin: 0; font-size: 0.875rem; }

    /* Student picker: the results open as a list right under the search box. */
    .picker input::-webkit-search-cancel-button { display: none; }
    .picker .chevron { --icon-size: 16px; }
    .options {
      display: grid; max-height: 264px; overflow-y: auto; padding: 4px;
      border: 1px solid var(--app-rule); border-radius: 14px; background: var(--app-paper);
    }
    .option {
      display: grid; gap: 2px; padding: 10px 12px; border: 0; border-radius: 10px;
      background: transparent; color: var(--app-ink); font: inherit; text-align: start; cursor: pointer;
    }
    .option + .option { box-shadow: 0 -1px 0 var(--app-rule); }
    .option:hover, .option:focus-visible { background: var(--app-surface); outline: none; }
    .option .name { font-size: 14px; font-weight: 500; }
    .option .meta, .status { font-size: 12px; color: var(--app-muted); }
    .status { margin: 0; padding: 10px 12px; line-height: 1.4; }
    .chosen { color: var(--app-ink); }

    .issue-bar {
      display: grid; gap: 16px; background: var(--app-surface);
      padding: 16px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
    }
    .issue-bar .form-error { margin: 0; }
    ion-footer { border-top: 1px solid var(--app-rule); box-shadow: none; }
  `],
})
export class IssueBookModal implements OnDestroy {
  @Input({ required: true }) book!: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  /** Text in the student box: what the user typed, or the chosen student's name. */
  readonly query = signal('');
  /** Whether the results list is showing under the box. */
  readonly open = signal(false);
  readonly students = signal<UserAccount[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly selected = signal<UserAccount | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  days: number | string = 14;
  private search$?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;

  /** Typing replaces any chosen student and searches again after a short pause. */
  type(value: string) {
    this.query.set(value);
    this.selected.set(null);
    this.open.set(true);
    this.searching.set(!!value.trim());
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search(value.trim()), SEARCH_DELAY);
  }

  choose(student: UserAccount) {
    this.selected.set(student);
    this.query.set(student.fullName);
    this.open.set(false);
    this.error.set('');
  }

  clear() {
    clearTimeout(this.timer);
    this.search$?.unsubscribe();
    this.query.set('');
    this.selected.set(null);
    this.students.set([]);
    this.searching.set(false);
    this.searched.set(false);
    this.open.set(true);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
    this.search$?.unsubscribe();
  }

  dueDate() {
    const days = Number(this.days) || 14;
    const due = new Date();
    due.setDate(due.getDate() + days);
    return formatDate(due.toISOString().slice(0, 10));
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  issue() {
    const student = this.selected();
    const days = Math.floor(Number(this.days));
    if (!student) {
      this.error.set('Choose a student first.');
      return;
    }
    if (!days || days < 1) {
      this.error.set('Loan period must be at least 1 day.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.issueBook(this.book.id, student.id, days).subscribe({
      next: issue => {
        this.ui.toast(`Issued to ${student.fullName}.`);
        this.modals.dismiss(issue, 'issued');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not issue the book.'));
      }
    });
  }

  private search(q: string) {
    this.search$?.unsubscribe();
    if (!q) {
      this.students.set([]);
      this.searching.set(false);
      this.searched.set(false);
      return;
    }
    this.searching.set(true);
    this.search$ = this.api.searchStudents(q).subscribe({
      next: list => {
        this.students.set(list);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.students.set([]);
        this.searching.set(false);
        this.searched.set(true);
      }
    });
  }
}
