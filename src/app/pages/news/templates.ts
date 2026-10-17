import { NewsTemplate } from '../../core/models';

/** The story templates in picker order, with the names staff see. */
export const NEWS_TEMPLATES: { value: NewsTemplate; label: string }[] = [
  { value: 'CLASSIC', label: 'Classic' },
  { value: 'SIDE_PHOTO', label: 'Side photo' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'PHOTO_BANNER', label: 'Photo banner' },
];

/**
 * The template a story is actually drawn with. A missing template is Classic, and the two
 * photo-led templates fall back to Classic when there is no photo to lead with.
 * A Notice stays a Notice either way (it never shows a photo).
 */
export function effectiveTemplate(template: NewsTemplate | null | undefined, hasPhoto: boolean): NewsTemplate {
  if (!template || !NEWS_TEMPLATES.some(t => t.value === template)) {
    return 'CLASSIC';
  }
  if (!hasPhoto && (template === 'SIDE_PHOTO' || template === 'PHOTO_BANNER')) {
    return 'CLASSIC';
  }
  return template;
}

/** Whether a story drawn with this template shows its photo. */
export function showsPhoto(template: NewsTemplate | null | undefined, hasPhoto: boolean): boolean {
  return hasPhoto && effectiveTemplate(template, hasPhoto) !== 'NOTICE';
}

/** "Photo banner" for PHOTO_BANNER; Classic when missing. */
export function templateLabel(template: NewsTemplate | null | undefined): string {
  return NEWS_TEMPLATES.find(t => t.value === template)?.label ?? 'Classic';
}

/** CSS-friendly name: PHOTO_BANNER → "photo-banner". */
export function templateClass(template: NewsTemplate): string {
  return template.toLowerCase().replace(/_/g, '-');
}
