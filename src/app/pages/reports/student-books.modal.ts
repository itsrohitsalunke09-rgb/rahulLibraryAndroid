import { Component, Input, inject } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { Reader } from '../../core/book-moves';
import { formatDate } from '../../core/dates';
import { MarathiPipe } from '../../core/pipes';

/** One student's books for the month in the books report: title, reg. no., issued and returned dates. */
@Component({
  selector: 'app-student-books',
  templateUrl: 'student-books.modal.html',
  styleUrls: ['student-books.modal.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonList, IonItem, IonLabel, MarathiPipe],
})
export class StudentBooksModal {
  @Input({ required: true }) reader!: Reader;
  /** "October 2026". */
  @Input({ required: true }) monthName!: string;

  private modals = inject(ModalController);
  readonly formatDate = formatDate;

  close() {
    this.modals.dismiss(null, 'cancel');
  }
}
