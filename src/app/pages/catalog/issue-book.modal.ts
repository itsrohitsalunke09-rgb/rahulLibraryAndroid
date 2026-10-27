import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Book, UserAccount } from '../../core/models';
import { AvatarHuePipe, InitialsPipe, MarathiPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';

/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY = 300;
/** Loan periods offered as one-tap choices, in days. */
const LOAN_PERIODS = [7, 14, 21, 30];

@Component({
  selector: 'app-issue-book',
  templateUrl: 'issue-book.modal.html',
  styleUrls: ['issue-book.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonSpinner,
    MarathiPipe, InitialsPipe, AvatarHuePipe
  ],
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
  readonly periods = LOAN_PERIODS;
  readonly days = signal(14);
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

  /** "Wed, 11 Nov 2026". */
  dueDate() {
    const due = new Date();
    due.setDate(due.getDate() + this.days());
    return due.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  issue() {
    const student = this.selected();
    const days = this.days();
    if (!student) {
      this.error.set('Choose a student first.');
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
