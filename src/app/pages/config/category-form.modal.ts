import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonList, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { CategoriesStore } from '../../core/categories.store';
import { BookCategory, BookCategoryRequest } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/** Add or edit one book category; editing also offers Delete. */
@Component({
  selector: 'app-category-form',
  templateUrl: 'category-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonInput, IonSpinner],
  styles: [`
    .form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }
    .hint { margin: 4px 4px 0; font-size: 12px; line-height: 1.4; color: var(--app-muted); }
    .delete {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px;
      margin-top: 28px; border: 1px solid var(--app-rust); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-rust); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .delete:disabled { opacity: 0.6; }
    .delete .icon { --icon-size: 17px; }
  `],
})
export class CategoryFormModal implements OnInit {
  /** Category to edit; leave empty to add a new one. */
  @Input() category?: BookCategory;

  private store = inject(CategoriesStore);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  form: BookCategoryRequest = { categoryNumber: '', name: '' };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');

  ngOnInit() {
    if (this.category) {
      this.form = { categoryNumber: this.category.categoryNumber, name: this.category.name };
    }
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const request: BookCategoryRequest = {
      categoryNumber: this.form.categoryNumber.trim(),
      name: this.form.name.trim(),
    };
    if (!request.categoryNumber || !request.name) {
      this.error.set('Enter both the category number and the category name.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.store.save(request, this.category?.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.toast(this.category ? 'Category updated.' : 'Category added.');
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the category.'));
      }
    });
  }

  async remove() {
    const category = this.category;
    if (!category) {
      return;
    }
    const ok = await this.ui.confirm('Delete category?',
      `"${category.name}" will be removed from the list. Books still using it must be moved first.`, 'Delete', true);
    if (!ok) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.store.delete(category.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.ui.toast('Category deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.deleting.set(false);
        this.error.set(errorMessage(err, 'Could not delete the category.'));
      }
    });
  }
}
