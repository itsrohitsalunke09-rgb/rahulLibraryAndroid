import { favouriteCategory } from './reader-profile.modal';

describe('favouriteCategory', () => {
  it('picksTheCategoryReadMostAndIgnoresBlanks', () => {
    expect(favouriteCategory([{ category: 'कथा' }, { category: ' ' }, { category: 'कादंबरी' }, { category: 'कथा' }])).toBe('कथा');
    expect(favouriteCategory([{ category: undefined }])).toBeNull();
  });
});
