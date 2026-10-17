# News cards and story templates

Date: 2026-10-17 · Status: approved in chat · Builds on `2026-10-17-news-newspaper-design.md`

## Purpose

The News tab becomes a list of cards with smaller photos, so readers see several stories at once.
Staff pick a **template** per story, which sets how its card looks in the News tab and how its full
story page looks, and they can preview both before saving.

## Templates

Wire values: `CLASSIC` (default), `SIDE_PHOTO`, `NOTICE`, `PHOTO_BANNER`.

| Template | Card in News tab | Full story page |
|---|---|---|
| Classic | Photo strip on top (max 140 px tall, `object-fit: cover`), headline, date, 2-line excerpt | Photo on top (max 240 px), then headline, date/byline, paragraphs |
| Side photo | 72 px square photo on the left; headline, date and 3-line excerpt beside it | Headline, date/byline, text wrapping a 120 px photo floated right |
| Notice | "Notice" tag, warning-coloured left edge, larger headline, 3-line excerpt, never a photo | Centred, boxed (warning border) headline + text; no photo |
| Photo banner | 160 px photo with the headline on a dark band across its bottom; date below | 240 px photo with the headline on a dark band, then date/byline and text |

Fallback: Side photo or Photo banner without a photo renders as Classic without a photo. Notice never
shows a photo (any stored photo is kept, just not shown). The photo caption shows on full story pages
under the photo (Classic, Side photo, Photo banner).

## Backend

- `NewsTemplate` enum with the four values. `news_stories.template` varchar(20), nullable (the
  existing row has none); `@Enumerated(EnumType.STRING)`.
- `NewsStoryRequest.template` (String, optional): blank/null → `CLASSIC`; unknown value → 400
  `"Unknown template"`.
- `NewsStoryResponse.template` (String): stored value, `CLASSIC` when null.

## App

- `NewsStory.template: NewsTemplate` and `NewsStoryRequest.template: NewsTemplate`, where
  `type NewsTemplate = 'CLASSIC' | 'SIDE_PHOTO' | 'NOTICE' | 'PHOTO_BANNER'`.
- Shared components in `src/app/pages/news/`:
  - `NewsCardComponent` (`app-news-card`): one card per the table. Inputs `story` (required) and
    `previewPhoto` (object URL for the form preview; when set it replaces the signed-in photo load).
  - `StoryViewComponent` (`app-story-view`): the full story body per the table, same inputs.
  - `effectiveTemplate(story, hasPhoto)` applies the fallback rule.
- **News tab**: slim header (library name `राहुल सार्वजनिक वाचनालय` in serif + today's date), then
  cards in one column, two columns from 600 px; refresher, infinite scroll, empty and error states
  as today. Tapping a card opens `StoryModal`, which now renders `StoryViewComponent`.
- **Staff form**: a Template picker (radio group of four tiles with a mini drawing and the name,
  default Classic) at the top; a live `NewsCardComponent` preview under it built from the form and the
  chosen/existing photo; a **Preview full story** button opening `StoryModal` with the draft (and
  preview photo). Notice hides the photo section and shows "Notices don't show a photo." Photo banner
  without a photo shows "Add a photo for the banner — without one it shows as Classic."
- **Staff list**: a small tag with the template name on each row.
- Type: serif headlines (`"Noto Serif", "Noto Serif Devanagari", Georgia, serif`) as today; cards use
  app surface tokens (light and dark). Long words wrap (`overflow-wrap: anywhere`).

## Out of scope

Per-template colours chosen by staff, more than one photo, reordering/pinning stories.
