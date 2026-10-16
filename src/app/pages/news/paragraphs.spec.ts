import { paragraphs } from './paragraphs';

describe('paragraphs', () => {
  it('splitsOnBlankLinesTrimsAndDropsEmpties', () => {
    expect(paragraphs('a\n\nb\n\n\n c ')).toEqual(['a', 'b', 'c']);
  });

  it('keepsSingleLineBreaksInsideAParagraph', () => {
    expect(paragraphs('one\ntwo')).toEqual(['one\ntwo']);
  });
});
