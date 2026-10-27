/** Splits story text into paragraphs at blank lines; single line breaks stay inside a paragraph. */
export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}
