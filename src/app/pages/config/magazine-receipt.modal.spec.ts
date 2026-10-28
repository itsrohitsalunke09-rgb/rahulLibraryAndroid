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
    return { modal: fixture.componentInstance, addMagazineReceipt, dismiss };
  }

  it('savesACombinedIssueAsOneSpanOverTheTickedMonths', () => {
    const { modal, addMagazineReceipt, dismiss } = render({
      periodicalId: 4, name: 'लोकराज्य', frequency: 'MONTHLY',
      subscriptionStart: '2026-01-01', subscriptionEnd: '2026-12-31', receipts: [],
    });
    modal.picked.set(new Set());
    for (const m of modal.months().filter(m => m.from === '2026-10-01' || m.from === '2026-11-01')) {
      modal.toggle(m);
    }
    expect(modal.pickedLabel()).toBe('Oct – Nov 2026');
    modal.receivedOn = '2026-10-20';
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(4, { receivedOn: '2026-10-20', periodFrom: '2026-10-01', periodTo: '2026-11-30' });
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 'saved');
  });

  it('fillsAWeeklyIssueWithTheWeekItCameIn', () => {
    const { modal, addMagazineReceipt } = render({ periodicalId: 7, name: 'India Today', frequency: 'WEEKLY', receipts: [] });
    modal.receivedOn = '2026-10-28';
    modal.fillPeriod();
    modal.save();
    expect(addMagazineReceipt).toHaveBeenCalledWith(7, { receivedOn: '2026-10-28', periodFrom: '2026-10-26', periodTo: '2026-11-01' });
  });
});
