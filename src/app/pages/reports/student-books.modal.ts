import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { BookIssue, StudentSummary, issueStatus } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { MarathiPipe } from '../../core/pipes';
import { errorMessage } from '../../core/ui.service';

/** One student's books across all years: title, reg. no., issued and returned dates, and Issued / Overdue / Returned. */
@Component({
  selector: 'app-student-books',
  templateUrl: 'student-books.modal.html',
  styleUrls: ['student-books.modal.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonList, IonItem, IonLabel, MarathiPipe, PageSkeletonComponent],
})
export class StudentBooksModal implements OnInit {
  @Input({ required: true }) student!: StudentSummary;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  readonly formatDate = formatDate;
  readonly status = issueStatus;

  readonly books = signal<BookIssue[] | null>(null);
  readonly error = signal('');

  ngOnInit() {
    this.api.studentIssues(this.student.studentId).subscribe({
      next: list => this.books.set(list),
      error: err => this.error.set(errorMessage(err, 'Could not load the books.')),
    });
  }

  close() {
    this.modals.dismiss(null, 'cancel');
  }
}
