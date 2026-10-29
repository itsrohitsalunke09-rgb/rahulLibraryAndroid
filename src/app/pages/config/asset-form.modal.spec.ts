import { AssetForm, assetRequest } from './asset-form.modal';

describe('assetRequest', () => {
  const form: AssetForm = { name: ' Ceiling fan ', quantity: '', location: ' ', purchaseDate: '', price: '', condition: 'GOOD', notes: '' };

  it('trims, and fills quantity 1 and empty fields as missing', () => {
    expect(assetRequest(form, '2026-10-30')).toEqual({
      name: 'Ceiling fan', quantity: 1, price: undefined, condition: 'GOOD',
      location: undefined, purchaseDate: undefined, notes: undefined,
    });
  });

  it('says what to fix', () => {
    expect(assetRequest({ ...form, name: ' ' }, '2026-10-30')).toBe('Enter the asset’s name.');
    expect(assetRequest({ ...form, quantity: '0' }, '2026-10-30')).toBe('Quantity must be a whole number, 1 or more.');
    expect(assetRequest({ ...form, quantity: '1.5' }, '2026-10-30')).toBe('Quantity must be a whole number, 1 or more.');
    expect(assetRequest({ ...form, price: '-2' }, '2026-10-30')).toBe('Enter a price of 0 or more.');
    expect(assetRequest({ ...form, purchaseDate: '2026-11-01' }, '2026-10-30')).toBe('The purchase date can’t be in the future.');
  });
});
