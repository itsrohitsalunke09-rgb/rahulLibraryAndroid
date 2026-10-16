import { hasDropCap, paragraphs } from './paragraphs';

describe('paragraphs', () => {
  it('splitsOnBlankLinesTrimsAndDropsEmpties', () => {
    expect(paragraphs('a\n\nb\n\n\n c ')).toEqual(['a', 'b', 'c']);
  });

  it('keepsSingleLineBreaksInsideAParagraph', () => {
    expect(paragraphs('one\ntwo')).toEqual(['one\ntwo']);
  });
});

describe('hasDropCap', () => {
  it('isTrueOnlyForALatinOpeningLetter', () => {
    expect(hasDropCap('  The fair opened')).toBe(true);
    expect(hasDropCap('डॉ. आंबेडकर जयंती')).toBe(false);
    expect(hasDropCap('"Quoted"')).toBe(false);
  });
});
