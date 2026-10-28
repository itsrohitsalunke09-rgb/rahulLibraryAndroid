import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { MagazineCard } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { MagazineReceiptModal } from './magazine-receipt.modal';

describe('MagazineReceiptModal', () => {
  function render(card: MagazineCard) {
    const addMagazineReceipt = vi.fn((_id: number, r: object) => of({ id: 9, ...r }));
    const dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { addMagazineReceipt } },
        { provide: ModalController, useValue: { dismiss } },
        { provide: UiService, useValue: { toast: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(MagazineReceiptModal);
    fixture.componentInstance.card = card;
    fixture.detectChanges();
    return { modal: fixture.componentInstance, fixture, addMagazineReceipt, dismiss };
  }

  it('monthlyIssueIsItsNumberAndPublishedDateSuggestingTheNextNumber', () => {
    const { modal, addMagazineReceipt, dismiss } = render({
      periodicalId: 4, name: 'लोकराज्य', frequency: 'MONTHLY',
      receipts: [{ id: 1, issueNo: 11, receivedOn: '2026-09-05', periodFrom: '2026-09-05', periodTo: '2026-09-05' }],
    });
    expect(modal.issueNo).toBe(12);
    modal.publishedOn = '2026-10-05';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(4, { issueNo: 12, receivedOn: '2026-10-05', periodFrom: '2026-10-05', periodTo: '2026-10-05' });
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 'saved');
  });

  it('weeklyIssueIsItsNumberAndFromToDates', () => {
    const { modal, addMagazineReceipt } = render({ periodicalId: 7, name: 'India Today', frequency: 'WEEKLY', receipts: [] });
    expect(modal.issueNo).toBe(1);
    modal.issueNo = 43;
    modal.periodFrom = '2026-10-19';
    modal.periodTo = '2026-10-25';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(7, { issueNo: 43, receivedOn: '2026-10-19', periodFrom: '2026-10-19', periodTo: '2026-10-25' });
  });

  it('newFromMovesToToTheEndOfThatIssueAndBarsEarlierDates', async () => {
    const { modal, fixture } = render({ periodicalId: 7, name: 'India Today', frequency: 'WEEKLY', receipts: [] });
    const from = fixture.nativeElement.querySelector('input[name=periodFrom]') as HTMLInputElement;
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('input'));
    expect(modal.periodTo).toBe('2026-11-07');
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('input[name=periodTo]') as HTMLInputElement).min).toBe('2026-11-01');
  });

  it('needsAnIssueNumber', () => {
    const { modal, addMagazineReceipt } = render({ periodicalId: 7, name: 'India Today', frequency: 'WEEKLY', receipts: [] });
    modal.issueNo = '';
    modal.save();
    expect(modal.error()).toContain('अंक');
    expect(addMagazineReceipt).not.toHaveBeenCalled();
  });
});
