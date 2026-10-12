import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList,
  IonSearchbar, IonSpinner, IonText, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { Book, UserAccount } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-issue-book',
  templateUrl: 'issue-book.modal.html',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSearchbar, IonList,
    IonItem, IonLabel, IonIcon, IonInput, IonFooter, IonSpinner, IonText
  ],
  styles: [`.book { margin: 0 0 4px; font-weight: 600; } .hint { color: var(--ion-color-medium); margin: 0; }`],
})
export class IssueBookModal {
  @Input({ required: true }) book!: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly students = signal<UserAccount[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly selected = signal<UserAccount | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  days: number | string = 14;
  private search$?: Subscription;

  constructor() {
    addIcons({ checkmarkCircle, ellipseOutline });
  }

  search(value: string | null | undefined) {
    const q = (value ?? '').trim();
    this.search$?.unsubscribe();
    if (!q) {
      this.students.set([]);
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
        this.searching.set(false);
        this.searched.set(true);
      }
    });
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
}
