# News Cards and Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Card-style News tab with smaller photos, and a per-story template (Classic, Side photo, Notice, Photo banner) chosen and previewed in the staff form.

**Architecture:** Backend stores a nullable `template` enum on `news_stories` (null reads as CLASSIC). The app adds two shared components — a card and a full-story view — that switch layout by template; the News tab, the story modal and the staff form preview all reuse them.

**Tech Stack:** Spring Boot 2.7 / Java 21 / JPA; Angular 22 standalone + Ionic 9; Vitest; JUnit 5 + Mockito + MockMvc.

**Spec:** `android-app/docs/superpowers/specs/2026-10-17-news-templates-design.md`

## Global Constraints

- Wire values exactly `CLASSIC`, `SIDE_PHOTO`, `NOTICE`, `PHOTO_BANNER`; default `CLASSIC`; unknown → 400 `"Unknown template"`.
- Fallback: `SIDE_PHOTO`/`PHOTO_BANNER` without a photo render as `CLASSIC`; `NOTICE` never shows a photo.
- Photo sizes: Classic card strip max 140 px tall; Side photo card 72 px square, full page 120 px float right; Photo banner card 160 px, full page 240 px; Classic full page max 240 px. All `object-fit: cover`.
- Cards: one column on phones, two from 600 px. Long words wrap (`overflow-wrap: anywhere`). Light and dark themes via existing app tokens.
- Serif stack `"Noto Serif", "Noto Serif Devanagari", Georgia, serif` for headlines and story text; drop cap rule from `paragraphs.ts` (`hasDropCap`) kept on full pages.
- Copy: tag `Notice`; hints `Notices don't show a photo.` and `Add a photo for the banner — without one it shows as Classic.`; button `Preview full story`.
- Photos still load only through `StoryPhotoDirective` (signed in), except the form preview, which uses the local object URL.
- Branch `news-templates` in `backend/` and `android-app/`. No push or Drive upload without the user's go-ahead.

## Review Focus

1. **Existing story with no template (null in DB)** must show as Classic in the app and be editable → Task 1 test `nullTemplateReadsAsClassic`.
2. **Changing the template on an existing story without touching the photo** keeps the photo → Task 1 test `updateTemplateKeepsPhoto`.
3. **Photo banner / side photo chosen but no photo** must not show an empty grey banner → Task 2 test `bannerWithoutPhotoFallsBackToClassic`.
4. **Notice on a story that has a photo** must not render the photo in card or page → Task 2 test `noticeNeverShowsPhoto`.
5. **Preview with a just-picked photo** must show that photo, not a request for the server one → Task 2 test `previewPhotoUsedInsteadOfServer`.

---

### Task 1: Backend template field

**Files:** Create `backend/src/main/java/org/ngolibrary/domain/NewsTemplate.java`; modify `domain/NewsStory.java`, `dto/NewsStoryRequest.java`, `dto/NewsStoryResponse.java`, `service/NewsService.java`; tests in `NewsServiceTest.java` (+ `NewsControllerTest.java` if the JSON shape test fits).

**Interfaces:**
- Produces: `enum NewsTemplate { CLASSIC, SIDE_PHOTO, NOTICE, PHOTO_BANNER }`; `NewsStory.template` (`@Enumerated(EnumType.STRING) @Column(length = 20)`, nullable); `NewsStoryRequest.template: String`; `NewsStoryResponse.template: String` (never null in output).

- [ ] **Step 1: Failing tests** in `NewsServiceTest`: `createDefaultsToClassic` (null and `""` → `CLASSIC`); `createStoresTemplate` (`"NOTICE"` → `NOTICE`); `unknownTemplateIs400` (`"POSTER"` → 400 `"Unknown template"`); `nullTemplateReadsAsClassic` (entity template null → response `"CLASSIC"`); `updateTemplateKeepsPhoto` (story hasPhoto, photoVersion 2, update with template `PHOTO_BANNER`, photo null → hasPhoto true, version 2, template `PHOTO_BANNER`).
- [ ] **Step 2:** `mvn -q test -Dtest=NewsServiceTest` → FAIL.
- [ ] **Step 3:** Implement; parse case-insensitively after trim.
- [ ] **Step 4:** `mvn -q test` and `mvn -q -DskipTests package` pass.
- [ ] **Step 5:** Commit `News: template per story`.

### Task 2: Card and story-view components

**Files:** Modify `android-app/src/app/core/models.ts`; create `src/app/pages/news/templates.ts` (`effectiveTemplate`, labels), `news-card.component.ts|html|scss`, `story-view.component.ts|html|scss`; tests `templates.spec.ts`, `news-card.component.spec.ts`, `story-view.component.spec.ts`.

**Interfaces:**
- Produces: `type NewsTemplate = 'CLASSIC' | 'SIDE_PHOTO' | 'NOTICE' | 'PHOTO_BANNER'`; `NewsStory.template: NewsTemplate`; `NewsStoryRequest.template: NewsTemplate`; `NEWS_TEMPLATES: { value: NewsTemplate; label: string }[]` in order Classic, Side photo, Notice, Photo banner; `effectiveTemplate(template: NewsTemplate | null | undefined, hasPhoto: boolean): NewsTemplate`; `showsPhoto(template, hasPhoto): boolean`.
- `NewsCardComponent` selector `app-news-card`, inputs `story: NewsStory` (required), `previewPhoto: string | null = null`; root element gets class `card-<template-lowercase-with-dashes>` of the effective template (e.g. `card-photo-banner`).
- `StoryViewComponent` selector `app-story-view`, same inputs; root class `view-<…>`.
- Photo element: `<img [appStoryPhoto]="story">` normally; `<img [src]="previewPhoto">` when `previewPhoto` is set.

- [ ] **Step 1: Failing tests:** `effectiveTemplate` table (null→CLASSIC; SIDE_PHOTO/PHOTO_BANNER without photo→CLASSIC; with photo unchanged; NOTICE stays NOTICE); `bannerWithoutPhotoFallsBackToClassic` (card class `card-classic`, no img); `noticeNeverShowsPhoto` (hasPhoto true, NOTICE → no img in card or view, `Notice` tag present); `previewPhotoUsedInsteadOfServer` (previewPhoto `blob:x` → img src `blob:x`, `ApiService.storyPhoto` never called); `sidePhotoCardShowsThumb`; story view renders one `<p>` per paragraph and keeps `hasDropCap` behaviour.
- [ ] **Step 2:** Run focused specs → FAIL.
- [ ] **Step 3:** Implement per the spec table and Global Constraints (excerpts via `-webkit-line-clamp`; card is a `<button>`-free `<article>` — the parent handles taps).
- [ ] **Step 4:** Full `npx ng test --watch=false`, `npx ng lint`, `npx ng build` (no budget warnings).
- [ ] **Step 5:** Commit `News: card and story-view templates`.

### Task 3: News tab and story modal use the templates

**Files:** Modify `src/app/pages/news/news.page.*`, `story.modal.*`, `paper.scss` (trim what moved into the components); update `news.page.spec.ts`.

**Interfaces:** Consumes Task 2 components. `StoryModal` keeps `@Input story` and adds `@Input previewPhoto: string | null = null`, passing both to `app-story-view`.

- [ ] **Step 1: Failing tests:** news page renders the slim header (contains `राहुल सार्वजनिक वाचनालय` and today's date) and one `app-news-card` per story; tapping a card opens `StoryModal` with that story; empty and error states unchanged (keep the existing tests passing).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: header + card grid (1 column, 2 from 600 px), cards wrapped in a tappable element with an accessible name (the headline).
- [ ] **Step 4:** Full tests, lint, build clean.
- [ ] **Step 5:** Commit `News tab: cards`.

### Task 4: Staff form template picker and preview

**Files:** Modify `src/app/pages/config/news-form.modal.*`, `src/app/pages/config/news.page.html|scss` (template tag); update `news-form.modal.spec.ts`.

**Interfaces:** Consumes `NEWS_TEMPLATES`, `NewsCardComponent`, `StoryModal` (`previewPhoto`). Form `form.template` defaults to `'CLASSIC'` for new stories and the story's value when editing (null → CLASSIC). Method `previewFull(): Promise<void>` opens `StoryModal` with a draft `NewsStory` built from the form (id 0 for new, `hasPhoto` = photo shown, `photoVersion` from the story) and `previewPhoto` = local preview URL or null.

- [ ] **Step 1: Failing tests:** `defaultsToClassic`; `editKeepsStoredTemplate`; `saveSendsTemplate`; `noticeHidesPhotoSection` (no photo chooser rendered, hint text present); `bannerWithoutPhotoShowsHint`; `previewFullOpensModalWithDraft` (ModalController.create called with component StoryModal and props containing the draft headline and previewPhoto).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: picker as a `role="radiogroup"` of four tile buttons (`role="radio"`, `aria-checked`), each with a small CSS-drawn layout sketch and label; live `app-news-card` preview under it; `Preview full story` secondary button; hints per Global Constraints; list rows show the template label tag.
- [ ] **Step 4:** Full tests, lint, build clean.
- [ ] **Step 5:** Commit `Config news: template picker and preview`.

### Task 5: Verify and release (controller)

- [ ] Browser check on the news mock (add `template` to mock stories) at 360 px, light and dark: four card templates, fallbacks, full pages, form picker and both previews.
- [ ] Final whole-branch review (most capable model), one fix wave, scoped re-review.
- [ ] With the user's go-ahead: merge to main in both repos, push backend, confirm the `template` column exists on the live DB, build APK, upload to Drive via Chrome.
