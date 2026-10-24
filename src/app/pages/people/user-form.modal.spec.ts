import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { UserAccount } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { UserFormModal } from './user-form.modal';

const student: UserAccount = { id: 5, username: 'asha', fullName: 'Asha Patil', role: 'STUDENT', active: true };

describe('UserFormModal Aadhaar photo', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let dismiss: ReturnType<typeof vi.fn>;

  function create(existing: UserAccount | undefined, savedPhoto: boolean) {
    api = {
      saveUser: vi.fn(() => of(existing ?? { ...student, id: 9 })),
      aadhaarPhoto: vi.fn(() => savedPhoto ? of(new Blob(['x'])) : throwError(() => new HttpErrorResponse({ status: 404 }))),
      saveAadhaarPhoto: vi.fn(() => of(undefined)),
      deleteAadhaarPhoto: vi.fn(() => of(undefined)),
    };
    dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: ModalController, useValue: { dismiss } },
        { provide: UiService, useValue: { toast: vi.fn(), error: vi.fn() } },
        { provide: AuthService, useValue: { isAdmin: () => true, user: signal({ id: 1 }) } },
      ],
    });
    const modal = TestBed.runInInjectionContext(() => new UserFormModal());
    modal.user = existing;
    modal.ngOnInit();
    return modal;
  }

  /** Stands in for a photo picked and shrunk, without decoding an image. */
  function choosePhoto(modal: UserFormModal) {
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
    (modal as unknown as { aadhaarPhoto: Blob }).aadhaarPhoto = photo;
    modal.aadhaarUrl.set('blob:chosen');
    return photo;
  }

  beforeEach(() => {
    URL.revokeObjectURL = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:saved');
  });

  it('uploads a chosen photo for a new account after it is created', () => {
    const modal = create(undefined, false);
    Object.assign(modal.form, { fullName: 'New Student', username: 'new', password: 'secret1' });
    const photo = choosePhoto(modal);
    modal.save();
    expect(api['saveAadhaarPhoto']).toHaveBeenCalledWith(9, photo);
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 'saved');
  });

  it('shows the saved photo and deletes it when removed', () => {
    const modal = create(student, true);
    expect(modal.aadhaarUrl()).toBe('blob:saved');
    modal.removeAadhaar();
    modal.save();
    expect(api['deleteAadhaarPhoto']).toHaveBeenCalledWith(5);
    expect(api['saveAadhaarPhoto']).not.toHaveBeenCalled();
  });

  it('sends nothing about the photo when it was not changed', () => {
    const modal = create(student, false);
    expect(modal.aadhaarError()).toBe('');
    modal.save();
    expect(api['saveAadhaarPhoto']).not.toHaveBeenCalled();
    expect(api['deleteAadhaarPhoto']).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledWith(student, 'saved');
  });

  it('still closes as saved when the photo upload fails', () => {
    const modal = create(student, false);
    choosePhoto(modal);
    api['saveAadhaarPhoto'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    modal.save();
    expect(dismiss).toHaveBeenCalledWith(student, 'saved');
  });
});
