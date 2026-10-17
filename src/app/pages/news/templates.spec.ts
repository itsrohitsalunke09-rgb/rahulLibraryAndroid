import { NEWS_TEMPLATES, effectiveTemplate, showsPhoto, templateClass, templateLabel } from './templates';

describe('effectiveTemplate', () => {
  it('appliesTheFallbackRule', () => {
    expect(effectiveTemplate(null, true)).toBe('CLASSIC');
    expect(effectiveTemplate(undefined, false)).toBe('CLASSIC');
    expect(effectiveTemplate('CLASSIC', false)).toBe('CLASSIC');
    expect(effectiveTemplate('SIDE_PHOTO', false)).toBe('CLASSIC');
    expect(effectiveTemplate('PHOTO_BANNER', false)).toBe('CLASSIC');
    expect(effectiveTemplate('SIDE_PHOTO', true)).toBe('SIDE_PHOTO');
    expect(effectiveTemplate('PHOTO_BANNER', true)).toBe('PHOTO_BANNER');
    expect(effectiveTemplate('NOTICE', true)).toBe('NOTICE');
    expect(effectiveTemplate('NOTICE', false)).toBe('NOTICE');
  });
});

describe('showsPhoto', () => {
  it('isTrueOnlyWithAPhotoAndNeverForNotices', () => {
    expect(showsPhoto('CLASSIC', true)).toBe(true);
    expect(showsPhoto('CLASSIC', false)).toBe(false);
    expect(showsPhoto('PHOTO_BANNER', false)).toBe(false);
    expect(showsPhoto('NOTICE', true)).toBe(false);
    expect(showsPhoto(null, true)).toBe(true);
  });
});

describe('NEWS_TEMPLATES', () => {
  it('listsTheFourTemplatesInPickerOrder', () => {
    expect(NEWS_TEMPLATES).toEqual([
      { value: 'CLASSIC', label: 'Classic' },
      { value: 'SIDE_PHOTO', label: 'Side photo' },
      { value: 'NOTICE', label: 'Notice' },
      { value: 'PHOTO_BANNER', label: 'Photo banner' },
    ]);
  });

  it('namesAndClassesFollowTheWireValue', () => {
    expect(templateLabel('PHOTO_BANNER')).toBe('Photo banner');
    expect(templateLabel(null)).toBe('Classic');
    expect(templateClass('PHOTO_BANNER')).toBe('photo-banner');
    expect(templateClass('SIDE_PHOTO')).toBe('side-photo');
  });
});
