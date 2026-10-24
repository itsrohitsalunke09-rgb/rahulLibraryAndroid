import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let auth: { sendResetCode: ReturnType<typeof vi.fn>; resetPassword: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let page: ForgotPasswordPage;

  beforeEach(() => {
    auth = { sendResetCode: vi.fn(() => of(undefined)), resetPassword: vi.fn(() => of(undefined)) };
    router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }, { provide: Router, useValue: router }],
    });
    page = TestBed.runInInjectionContext(() => new ForgotPasswordPage());
  });

  afterEach(() => page.ngOnDestroy());

  it('asks for a valid email before sending a code', () => {
    page.email = 'not-an-email';
    page.submit();
    expect(auth.sendResetCode).not.toHaveBeenCalled();
    expect(page.error()).toBe('Enter the email address on your account.');
  });

  it('sends the code and moves to the code step with a resend wait', () => {
    page.email = ' asha@example.com ';
    page.submit();
    expect(auth.sendResetCode).toHaveBeenCalledWith('asha@example.com');
    expect(page.step()).toBe('code');
    expect(page.resendIn()).toBe(60);
  });

  it('checks the code and that both passwords match before resetting', () => {
    page.email = 'asha@example.com';
    page.submit();
    page.code = '12345';
    page.submit();
    expect(page.error()).toBe('Enter the 6-digit code from the email.');
    page.code = '123456';
    page.password = 'secret1';
    page.confirm = 'secret2';
    page.submit();
    expect(page.error()).toBe("The two passwords don't match.");
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('resets and returns to sign in with a confirmation', () => {
    page.email = 'asha@example.com';
    page.submit();
    Object.assign(page, { code: '123456', password: 'secret1', confirm: 'secret1' });
    page.submit();
    expect(auth.resetPassword).toHaveBeenCalledWith('asha@example.com', '123456', 'secret1');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true, queryParams: { reset: 1 } });
  });

  it("shows the server's message when the code is wrong", () => {
    auth.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'The code is wrong or has expired. Ask for a new code.' }
    })));
    page.email = 'asha@example.com';
    page.submit();
    Object.assign(page, { code: '123456', password: 'secret1', confirm: 'secret1' });
    page.submit();
    expect(page.error()).toBe('The code is wrong or has expired. Ask for a new code.');
    expect(page.loading()).toBe(false);
  });
});
