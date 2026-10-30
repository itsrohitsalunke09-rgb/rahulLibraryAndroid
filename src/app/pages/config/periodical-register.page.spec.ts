import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { localIsoDate } from '../../core/dates';
import { DayRegister, rupees } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { PeriodicalRegisterPage } from './periodical-register.page';

const day: DayRegister = {
  date: '2026-10-25',
  rows: [
    { periodicalId: 1, name: 'सकाळ', frequency: 'DAILY', defaultPrice: 6, arrived: true, price: 8 },
    { periodicalId: 2, name: 'लोकराज्य', frequency: 'MONTHLY', defaultPrice: 20, arrived: false, price: 20 },
  ],
};

describe('PeriodicalRegisterPage', () => {
  let api: { periodicalRegister: ReturnType<typeof vi.fn>; savePeriodicalRegister: ReturnType<typeof vi.fn> };
  let confirm: ReturnType<typeof vi.fn>;

  function create() {
    api = { periodicalRegister: vi.fn(() => of(day)), savePeriodicalRegister: vi.fn(() => of(day)) };
    confirm = vi.fn(async () => false);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api }, { provide: UiService, useValue: { toast: vi.fn(), confirm } },
        { provide: AuthService, useValue: { isAdmin: () => false } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new PeriodicalRegisterPage());
    page.ionViewWillEnter();
    return page;
  }

  it("opens today's register and totals the ticked copies", () => {
    const page = create();
    expect(api.periodicalRegister).toHaveBeenCalledWith(localIsoDate());
    expect(page.ticked()).toBe(1);
    expect(page.total()).toBe(8);
  });

  it('sends every line: ticked with its price, unticked without', () => {
    const page = create();
    page.lines().forEach(l => (l.arrived = true));
    page.lines()[1].priceText = '25';
    page.save();
    expect(api.savePeriodicalRegister).toHaveBeenCalledWith(localIsoDate(), [
      { periodicalId: 1, arrived: true, price: 8, copies: 1 },
      { periodicalId: 2, arrived: true, price: 25, copies: 1 },
    ]);
    expect(page.dirty()).toBe(false);
  });

  it('asks for a price on a ticked copy', () => {
    const page = create();
    page.lines()[0].priceText = '';
    page.save();
    expect(page.error()).toBe('Enter the price for सकाळ (0 to 10,000).');
    expect(api.savePeriodicalRegister).not.toHaveBeenCalled();
  });

  it('won’t mark received with nothing ticked on a new day', async () => {
    const page = create();
    api.periodicalRegister.mockReturnValue(of({ ...day, rows: day.rows.map(r => ({ ...r, arrived: false })) }));
    page.ionViewWillEnter();
    await page.save();
    expect(page.error()).toBe('Tick at least one newspaper that came.');
    expect(confirm).not.toHaveBeenCalled();
    expect(api.savePeriodicalRegister).not.toHaveBeenCalled();
  });

  it('asks before clearing a day that had copies saved', async () => {
    const page = create();
    page.lines().forEach(l => (l.arrived = false));
    // The loaded day had a saved copy, so clearing it asks first (and the user says no here).
    await page.save();
    expect(confirm).toHaveBeenCalled();
    expect(api.savePeriodicalRegister).not.toHaveBeenCalled();
  });

  it("won't open a future day, and keeps unsaved ticks unless the user agrees", async () => {
    const page = create();
    expect(await page.goTo('2999-01-01')).toBe(false);
    page.changed();
    expect(await page.goTo('2026-10-01')).toBe(false);
    expect(confirm).toHaveBeenCalled();
    expect(page.date()).toBe(localIsoDate());
  });

  it('formats rupees the Indian way', () => {
    expect(rupees(1250.5)).toBe('₹1,250.5');
    expect(rupees(125000)).toBe('₹1,25,000');
  });
});
