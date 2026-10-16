# News & events: a newspaper inside the app

Date: 2026-10-17 · Status: design, awaiting review

## Purpose

Staff (admin, librarian) publish the library's events as short stories. Everyone who signs in reads
them in a **News** tab that looks and reads like a printed newspaper, not like an app list.

Success means:

- A librarian can add a story (headline, date, text, optional photo with caption) from Config in
  under a minute on a phone.
- A student opening News sees a front page with a masthead, a lead story with its photo, and older
  stories below. Reading a story feels like reading a newspaper article.
- Photos survive server restarts and are visible only to signed-in users.

## Decisions taken

| Question | Decision |
|---|---|
| Where readers open it | A new **News** bottom tab for every role, placed after Catalog |
| Shape of one entry | A **story**: headline + event date + text, optional photo + caption |
| Reader layout | **One front page**: newest story as the lead, the rest below; tap for the full story |
| Photo storage | **In the existing Postgres database** (Supabase), shrunk on the phone before upload |
| Photo access | Signed-in users only (photos may show children) |
| Drafts | None: a saved story is visible straight away |
| Website (Angular 14) | Out of scope for now |

## 1. Backend (Spring Boot, `backend/`)

### Data

`news_stories` (entity `NewsStory`)

| Column | Type | Rules |
|---|---|---|
| id | bigint, identity | |
| headline | varchar(150) | required, trimmed |
| body | text | required, trimmed, max 10,000 characters |
| event_date | date | required |
| photo_caption | varchar(200) | optional; cleared when the story has no photo |
| has_photo | boolean | true when a `news_photos` row exists |
| photo_version | int | incremented whenever the photo changes; used in the photo URL to bust caches |
| created_by_name | varchar(100) | full name of the staff member who created it |
| created_at, updated_at | timestamp | set by the service |

`news_photos` (entity `NewsPhoto`), one row per story with a photo

| Column | Type | Rules |
|---|---|---|
| story_id | bigint, primary key, references news_stories(id) | |
| content_type | varchar(30) | image/jpeg, image/png or image/webp |
| data | bytea | at most 2 MB |

The photo lives in its own table so listing stories never loads image bytes. Tables are created by
`ddl-auto: update`, as for the existing entities.

### API

All under `/api/news`. Reads need any signed-in user; writes need ADMIN or LIBRARIAN.

| Method & path | Who | Body / params | Returns |
|---|---|---|---|
| `GET /api/news?page&size` | signed in | default size 10 | `Page<NewsStoryResponse>`, ordered by event_date desc, id desc |
| `GET /api/news/{id}` | signed in | | `NewsStoryResponse` |
| `GET /api/news/{id}/photo` | signed in | `?v=` ignored by the server | image bytes with its content type; `Cache-Control: private, max-age=31536000` |
| `POST /api/news` | staff | multipart: `story` (JSON `NewsStoryRequest`), optional `photo` file | `NewsStoryResponse`, 201 |
| `PUT /api/news/{id}` | staff | multipart: `story`, optional `photo`; `story.removePhoto=true` drops the photo | `NewsStoryResponse` |
| `DELETE /api/news/{id}` | staff | | 204 |

`NewsStoryRequest`: `headline`, `body`, `eventDate`, `photoCaption`, `removePhoto`.

`NewsStoryResponse`: `id`, `headline`, `body`, `eventDate`, `photoCaption`, `hasPhoto`,
`photoVersion`, `createdByName`, `createdAt`, `updatedAt`.

Validation errors (missing headline/body/date, text too long, photo too big or not an image) return
400 with `{ message }` through the existing `RestExceptionHandler`. Unknown id returns 404.

### Files

- `domain/NewsStory.java`, `domain/NewsPhoto.java`
- `repo/NewsStoryRepository.java`, `repo/NewsPhotoRepository.java`
- `dto/NewsStoryRequest.java`, `dto/NewsStoryResponse.java`
- `service/NewsService.java` (validation, photo handling, version bump)
- `web/NewsController.java`
- `security/SecurityConfig.java`: write methods on `/api/news/**` restricted to staff, if the
  existing method-level checks don't already cover it (follow whatever `BookCategoryController` does)
- `spring.servlet.multipart.max-file-size` raised to at least 3MB if the current limit is lower

### Tests

- Service: rejects blank headline/body, missing date, body over 10,000 chars, photo over 2 MB,
  non-image content type; `removePhoto` deletes the photo and clears the caption; replacing a photo
  bumps `photo_version`.
- Controller/security: a STUDENT gets 403 on POST/PUT/DELETE and 200 on GET; an anonymous request to
  the photo endpoint is refused with the same status the other protected endpoints return today.

## 2. App: staff editor (`android-app/`)

- **Config page**: new row **News & events** under Book categories, showing the story count.
- **`pages/config/news.page`** (route `tabs/config/news`, staff only): list like Book categories,
  showing a thumbnail, headline and date per story, newest first; search box (filters loaded stories
  by headline); pull-to-refresh; **+** to add; tap to edit.
- **`pages/config/news-form.modal`**: uses the shared `.form-*` field design.
  - Headline (required), Event date (required, default today), Story (tall textarea that grows;
    blank lines become paragraphs), Photo, Caption (shown only with a photo).
  - Photo: hidden `<input type="file" accept="image/*">` behind a "Choose photo" box, so Android
    offers gallery or camera. A preview with **Replace** and **Remove** appears once chosen.
  - Before upload the photo is shrunk in `core/image-resize.ts` (canvas): longest side at most 1280 px,
    JPEG quality 0.8. Files that cannot be decoded show "This file isn't a photo the app can read."
  - Editing shows **Delete story** at the bottom with a confirmation.
- `ApiService`: `news(page, size)`, `story(id)`, `saveStory(request, photo?, id?)`,
  `deleteStory(id)`, `storyPhoto(id, version)` (returns a Blob). Writes go through `changes()` so the
  News tab refreshes after edits.

## 3. App: newspaper reader

- **Tab**: `tabs/news`, every role, after Catalog; new `assets/icons/tab-news.svg` (folded newspaper),
  in the same style as the other tab icons. Staff then have 7 tabs. **To verify during
  implementation:** labels still fit at 320–360 px; if not, shorten labels or hide them at
  narrow widths.
- **`pages/news/news.page`** (front page)
  - Paper theme tokens: warm off-white paper and near-black ink in light mode; a dark "evening paper"
    version in dark mode. Thin rules (`1px` ink at low opacity) separate sections.
  - Type: `"Noto Serif", "Noto Serif Devanagari", Georgia, serif`, which uses the phone's built-in
    serif fonts, so nothing is downloaded.
  - Masthead: राहुल सार्वजनिक वाचनालय, large serif, between double rules; dateline below with
    today's date and "Shindewadi".
  - Lead story = the newest: big headline, full-width photo with italic caption, the first paragraph
    with a drop cap, "Continue reading →".
  - Other stories: headline, date, small photo floated beside the first lines (clamped to about 4 lines),
    "Continue reading →"; separated by rules; two columns at ≥ 768 px.
  - Infinite scroll (10 per page) via `PagedList`; pull-to-refresh; `revisit()` on tab enter.
  - Empty state: "No news yet — the librarian's stories will appear here."
- **`pages/news/story.modal`** (full story): headline, date and author line, photo with caption, the
  full text as paragraphs, justified with hyphenation, drop cap on the first paragraph.
- **Photos**: an `appAuthImg` directive fetches `/api/news/{id}/photo?v={photoVersion}` through
  `HttpClient` (so the token is sent), shows it via an object URL, and revokes the URL on destroy.
  A grey placeholder of the right aspect ratio shows while loading or on error.
- Marathi headlines and text use the Devanagari serif automatically through the font stack.

### App tests

- `image-resize`: a large image comes out with longest side 1280 and type image/jpeg; a small image
  is not enlarged.
- News page: renders the masthead, makes the first story the lead, and shows the empty state when
  there are no stories.
- Role preloading: the News route preloads for every role.

## 4. Release

1. Backend: build and test locally, then push to `main`; Render redeploys and creates the tables.
   **Pushing needs your go-ahead** because it changes the live server.
2. App: build, sync, debug APK, upload to Drive as before.
3. Order matters: the app's News tab shows an error until the new backend is live.

## Out of scope

Drafts and scheduling, multiple photos per story, comments and likes, push notifications, the
website, and editing history.
