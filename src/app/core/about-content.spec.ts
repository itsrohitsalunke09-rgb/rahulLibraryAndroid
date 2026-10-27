import { DEFAULT_ABOUT, aboutBlocks, instagramHandle, withDefaults } from './about-content';

describe('aboutBlocks', () => {
  it('turns "- " lines into one list and other lines into paragraphs', () => {
    expect(aboutBlocks('Intro line one\nline two\n\n- first\n- second\nAfter the list')).toEqual([
      { kind: 'p', text: 'Intro line one line two' },
      { kind: 'ul', items: ['first', 'second'] },
      { kind: 'p', text: 'After the list' },
    ]);
  });

  it('starts a new paragraph at a blank line and ignores extra blank lines', () => {
    expect(aboutBlocks('\n\nOne\n\n\nTwo\n')).toEqual([
      { kind: 'p', text: 'One' },
      { kind: 'p', text: 'Two' },
    ]);
  });

  it('accepts "•" bullets and handles empty text', () => {
    expect(aboutBlocks('• a\n• b')).toEqual([{ kind: 'ul', items: ['a', 'b'] }]);
    expect(aboutBlocks('')).toEqual([]);
  });
});

describe('withDefaults', () => {
  it('fills fields an older saved version lacks', () => {
    const merged = withDefaults({ title: 'New title' });
    expect(merged.title).toBe('New title');
    expect(merged.timeline).toEqual(DEFAULT_ABOUT.timeline);
    expect(withDefaults(null)).toEqual(DEFAULT_ABOUT);
  });
});

describe('instagramHandle', () => {
  it('takes the profile name from a link, tracking codes and slashes aside', () => {
    expect(instagramHandle('https://www.instagram.com/rahul_public_library/?xtok=abc')).toBe('rahul_public_library');
    expect(instagramHandle('https://www.instagram.com/rahul_public_library')).toBe('rahul_public_library');
  });
});
