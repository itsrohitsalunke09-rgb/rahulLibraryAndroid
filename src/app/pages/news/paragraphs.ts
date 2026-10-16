/** Splits story text into paragraphs at blank lines; single line breaks stay inside a paragraph. */
export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

/** A drop cap suits only a Latin opening letter; Devanagari clusters (e.g. "डॉ.") look wrong enlarged. */
export function hasDropCap(paragraph: string): boolean {
  return /^[A-Za-z]/.test(paragraph.trim());
}
