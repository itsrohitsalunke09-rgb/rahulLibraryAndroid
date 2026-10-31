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

  const monthly = (receipts: MagazineCard['receipts'] = []): MagazineCard => ({
    periodicalId: 4, name: 'लोकराज्य', frequency: 'MONTHLY', subscriptionStart: '2026-01-01', subscriptionEnd: '2026-12-31', receipts,
  });

  it('monthlyIssueCoversTheMonthsTappedFirstToLastSuggestingTheNextNumber', () => {
    const { modal, addMagazineReceipt, dismiss } = render(monthly(
      [{ id: 1, issueNo: 11, receivedOn: '2026-09-05', periodFrom: '2026-09-05', periodTo: '2026-09-05' }]));
    expect(modal.issueNo).toBe(12);
    const month = (from: string) => modal.periods().find(p => p.from === from)!;
    modal.chosen.set([]);
    modal.togglePeriod(month('2026-12-01'));
    modal.togglePeriod(month('2026-10-01'));
    // The month between the two tapped is covered too.
    expect(modal.isCovered(month('2026-11-01'))).toBe(true);
    modal.publishedOn = '2026-10-05';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(4, { issueNo: 12, issueLabel: null, receivedOn: '2026-10-05', periodFrom: '2026-10-01', periodTo: '2026-12-31', copies: 1 });
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 'saved');
  });

  it('monthlyNeedsNothing', () => {
    const { modal, addMagazineReceipt } = render(monthly());
    modal.issueNo = '';
    modal.copies = '';
    modal.publishedOn = '2026-03-10';
    modal.chosen.set([]);
    modal.save();
    expect(modal.error()).toBe('');
    // No month tapped: the published month.
    expect(addMagazineReceipt).toHaveBeenCalledWith(4, { issueNo: null, issueLabel: null, receivedOn: '2026-03-10', periodFrom: '2026-03-01', periodTo: '2026-03-31', copies: 1 });
  });

  it('fortnightlyJodAnkCoversTheFortnightsTapped', () => {
    const { modal, addMagazineReceipt } = render({
      periodicalId: 5, name: 'चित्रलेखा', frequency: 'FORTNIGHTLY', subscriptionStart: '2026-01-01', subscriptionEnd: '2026-12-31', receipts: [],
    });
    const half = (from: string) => modal.periods().find(p => p.from === from)!;
    modal.chosen.set([]);
    modal.save();
    expect(modal.error()).toContain('fortnight');
    modal.togglePeriod(half('2026-09-01'));
    modal.togglePeriod(half('2026-09-16'));
    // जोडअंक written in the अंक box is saved as written.
    modal.issueNo = 'जोडअंक';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(5, { issueNo: null, issueLabel: 'जोडअंक', receivedOn: '2026-09-01', periodFrom: '2026-09-01', periodTo: '2026-09-30', copies: 1 });
  });

  it('weeklyIssueIsItsNumberAndFromToDates', () => {
    const { modal, addMagazineReceipt } = render({ periodicalId: 7, name: 'India Today', frequency: 'WEEKLY', receipts: [] });
    expect(modal.issueNo).toBe(1);
    modal.issueNo = 43;
    modal.periodFrom = '2026-10-19';
    modal.periodTo = '2026-10-25';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(7, { issueNo: 43, issueLabel: null, receivedOn: '2026-10-19', periodFrom: '2026-10-19', periodTo: '2026-10-25', copies: 1 });
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
