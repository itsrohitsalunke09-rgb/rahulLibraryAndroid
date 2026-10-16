import { Component, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { BookImportResult } from '../../core/models';
import { errorMessage } from '../../core/ui.service';

/** Sheet columns, in the order the server reads them (same as the website's template). */
const COLUMNS: { name: string; required?: boolean }[] = [
  { name: 'Title', required: true }, { name: 'Author', required: true }, { name: 'Category No.' },
  { name: 'Total Copies', required: true }, { name: 'Description' }, { name: 'Date (yyyy-MM-dd)' },
  { name: 'Registration Number' }, { name: 'Publication' }, { name: 'Publication Year' }, { name: 'Page Count' },
  { name: 'Seller' }, { name: 'Receipt Number' }, { name: 'Price' },
];

/** Bulk-add books from an Excel sheet, like the website's "Import Excel". Staff only. */
@Component({
  selector: 'app-import-books',
  templateUrl: 'import-books.modal.html',
  styleUrls: ['import-books.modal.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner],
})
export class ImportBooksModal {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly columns = COLUMNS;
  readonly file = signal<File | null>(null);
  readonly importing = signal(false);
  readonly error = signal('');
  readonly result = signal<BookImportResult | null>(null);

  pick(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.result.set(null);
    if (file && !file.name.toLowerCase().endsWith('.xlsx')) {
      this.file.set(null);
      this.error.set('Choose an Excel file saved as .xlsx.');
      return;
    }
    this.error.set('');
    this.file.set(file);
  }

  upload() {
    const file = this.file();
    if (!file) {
      this.error.set('Choose an Excel file first.');
      return;
    }
    this.importing.set(true);
    this.error.set('');
    this.api.importBooks(file).subscribe({
      next: result => {
        this.importing.set(false);
        this.result.set(result);
        this.file.set(null);
      },
      error: err => {
        this.importing.set(false);
        this.error.set(errorMessage(err, 'Could not import the file.'));
      }
    });
  }

  close() {
    // Tell the catalog to reload when at least one book was added.
    const added = this.result()?.successful ?? 0;
    this.modals.dismiss(this.result(), added > 0 ? 'imported' : 'cancel');
  }

  fileSize(file: File) {
    return file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }
}
