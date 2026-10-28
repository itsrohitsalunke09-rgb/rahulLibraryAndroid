import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import { MagazineDetailModal } from './magazine-detail.modal';

describe('MagazineDetailModal', () => {
  it('listsIssuesInAnkOrderAndRemovingOneRecolorsTheStripAndTellsTheRow', async () => {
    const deleteMagazineReceipt = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { deleteMagazineReceipt } },
        { provide: ModalController, useValue: { dismiss: vi.fn() } },
        { provide: UiService, useValue: { confirm: vi.fn(async () => true), toast: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(MagazineDetailModal);
    const modal = fixture.componentInstance;
    const onChange = vi.fn();
    modal.card = {
      periodicalId: 7, name: 'India Today', frequency: 'WEEKLY',
      receipts: [
        { id: 1, issueNo: 1, receivedOn: '2026-10-05', periodFrom: '2026-10-05', periodTo: '2026-10-11' },
        { id: 2, issueNo: 2, receivedOn: '2026-10-12', periodFrom: '2026-10-12', periodTo: '2026-10-18' },
      ],
    };
    modal.onChange = onChange;
    fixture.detectChanges();
    expect(modal.sorted().map(r => r.issueNo)).toEqual([1, 2]);

    await modal.remove(modal.sorted()[1]);
    expect(deleteMagazineReceipt).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })]);
    expect(modal.sorted().length).toBe(1);
    expect(modal.received()).toBe(1);
  });
});
