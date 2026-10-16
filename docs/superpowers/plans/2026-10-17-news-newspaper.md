# News & Events Newspaper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff publish event stories (headline, date, text, optional photo) from Config; everyone reads them in a newspaper-style News tab.

**Architecture:** Spring Boot gets two tables (`news_stories`, `news_photos`) and a `/api/news` controller; photos are stored as bytea and served only to signed-in users. The Ionic app gets a Config editor (list + form modal, photo shrunk on the phone) and a News tab (front page + full-story modal) whose photos load through `HttpClient` so the JWT is sent.

**Tech Stack:** Spring Boot 2.7 / Java 21 / JPA / Postgres; Angular 22 standalone + Ionic 9 + Capacitor 8; Vitest (app), JUnit 5 + Mockito + MockMvc (backend).

**Spec:** `android-app/docs/superpowers/specs/2026-10-17-news-newspaper-design.md`

## Global Constraints

- Headline required, max 150 chars; body required, max 10,000 chars; event date required; caption max 200 chars.
- Photo: image/jpeg, image/png or image/webp only, at most 2 MB stored; the app shrinks to longest side 1280 px, JPEG quality 0.8 before upload.
- Reads (`GET`) for any signed-in user; writes for `ADMIN` / `LIBRARIAN` via `@PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")`, like `BookCategoryController`.
- Photo endpoint is never public; response header `Cache-Control: private, max-age=31536000`; the app URL carries `?v={photoVersion}`.
- List order: event date newest first, then id newest first. App page size 10.
- Errors are `ResponseStatusException` with a readable reason (handled by the existing `RestExceptionHandler` → `{ message }`).
- App forms use the shared `.form-*` classes from `src/global.scss`; no new Ionic input components.
- Reader fonts: `"Noto Serif", "Noto Serif Devanagari", Georgia, serif` (phone fonts; nothing bundled).
- Masthead text: `राहुल सार्वजनिक वाचनालय`; dateline place: `Shindewadi`. Empty state: `No news yet — the librarian's stories will appear here.` Decode error: `This file isn't a photo the app can read.`
- Work on branch `news-newspaper` in both `backend/` and `android-app/`. Pushing the backend to `main` (which redeploys Render) needs the user's explicit go-ahead.

## Review Focus

1. **Editing a story without touching the photo** must keep the photo and its version (PUT with no file, `removePhoto=false`). → test in Task 1.
2. **A photo the WebView can't decode** (e.g. HEIC from an iPhone transfer, or a PDF picked by mistake) must show the decode error, not upload garbage or hang. → test in Task 3.
3. **A photo that fails to load** (story deleted meanwhile, 404, offline) must show the placeholder, never a broken-image icon. → test in Task 4.
4. **Server asleep or offline when opening News** must show the error message, not a blank paper. → test in Task 6.
5. **Very long words / unbroken Marathi text or URLs in a story** must wrap inside the column, never widen the page. → CSS `overflow-wrap: anywhere` on story text, checked in Task 6's browser check at 320 px.

---

### Task 0: Branches and baseline

**Files:** none (git only)

- [ ] **Step 1:** In `android-app/`, the earlier optimisation and form-design work is uncommitted on `main`. Ask the user before committing it; with their OK: `git switch -c news-newspaper`, `git add -A`, `git commit -m "Optimise tab reloads, preload by role, shared form fields, issue-book student picker"`.
- [ ] **Step 2:** In `backend/`: `git switch -c news-newspaper`.
- [ ] **Step 3:** Baseline: `mvn -q -DskipTests package` in `backend/` succeeds; `npx ng test --watch=false` in `android-app/` shows 10 passed.

### Task 1: Backend data, service and validation

**Files:**
- Create: `backend/src/main/java/org/ngolibrary/domain/NewsStory.java`, `domain/NewsPhoto.java`
- Create: `repo/NewsStoryRepository.java`, `repo/NewsPhotoRepository.java`
- Create: `dto/NewsStoryRequest.java`, `dto/NewsStoryResponse.java`
- Create: `service/NewsService.java`
- Test: `backend/src/test/java/org/ngolibrary/service/NewsServiceTest.java` (first test in the repo; Mockito, no Spring context)

**Interfaces:**
- Produces:
  - `NewsStory` fields per spec table (`id, headline, body, eventDate: LocalDate, photoCaption, hasPhoto: boolean, photoVersion: int, createdByName, createdAt, updatedAt: LocalDateTime`); `body` mapped `@Column(columnDefinition = "text")`.
  - `NewsPhoto`: `@Id Long storyId`, `contentType`, `byte[] data` mapped `@Column(columnDefinition = "bytea")` (no `@Lob`).
  - `NewsStoryRepository extends JpaRepository<NewsStory, Long>` with `Page<NewsStory> findAllByOrderByEventDateDescIdDesc(Pageable p)`.
  - `NewsPhotoRepository extends JpaRepository<NewsPhoto, Long>`.
  - `NewsStoryRequest`: `headline, body, eventDate (LocalDate), photoCaption, removePhoto (boolean)`.
  - `NewsStoryResponse` record with the spec's fields and `static NewsStoryResponse from(NewsStory s)`.
  - `NewsService`:
    - `Page<NewsStoryResponse> list(int page, int size)`
    - `NewsStoryResponse get(Long id)`
    - `NewsStoryResponse create(NewsStoryRequest req, MultipartFile photo /* nullable */, UserAccount author)`
    - `NewsStoryResponse update(Long id, NewsStoryRequest req, MultipartFile photo /* nullable */)`
    - `void delete(Long id)` (deletes photo row then story)
    - `NewsPhoto photo(Long id)` (404 `"Photo not found"` when absent)
    - constants `MAX_HEADLINE = 150, MAX_BODY = 10_000, MAX_CAPTION = 200, MAX_PHOTO_BYTES = 2 * 1024 * 1024`, `Set<String> PHOTO_TYPES = {"image/jpeg","image/png","image/webp"}`

- [ ] **Step 1: Write the failing tests** in `NewsServiceTest` (mock both repos; `save` returns its argument, assigning id 1 when null):
  - `createRejectsBlankHeadline`: headline `"  "` → `ResponseStatusException` status 400, reason `"Headline is required"`.
  - `createRejectsBlankBody` → 400 `"Story text is required"`; `createRejectsMissingDate` → 400 `"Event date is required"`.
  - `createRejectsLongBody`: 10,001 chars → 400 `"Story text can be at most 10000 characters"`; 10,000 chars passes.
  - `createRejectsLongHeadline`: 151 chars → 400 `"Headline can be at most 150 characters"`.
  - `createRejectsBigPhoto`: `MockMultipartFile` of 2 MB + 1 byte, `image/jpeg` → 400 `"Photo must be under 2 MB"`.
  - `createRejectsNonImage`: `application/pdf` → 400 `"Photo must be a JPEG, PNG or WebP image"`.
  - `createWithPhotoSavesPhotoAndSetsVersion1`: result `hasPhoto == true`, `photoVersion == 1`, `createdByName` = author's full name, photo repo `save` called with the bytes.
  - `updateWithoutFileKeepsPhoto` (Review Focus 1): existing story `hasPhoto=true, photoVersion=3`, update with `photo=null, removePhoto=false` → `hasPhoto` still true, `photoVersion` still 3, photo repo `deleteById` never called.
  - `updateReplacingPhotoBumpsVersion`: new file → `photoVersion` 4.
  - `updateRemovePhotoClearsCaption`: `removePhoto=true` → `hasPhoto` false, `photoCaption` null, `deleteById(id)` called.
  - `captionClearedWhenNoPhoto`: create without photo but with caption → `photoCaption` null.
  - `updateUnknownIdIs404` → 404 `"Story not found"`.
- [ ] **Step 2:** Run `mvn -q test -Dtest=NewsServiceTest` → FAIL (classes missing).
- [ ] **Step 3:** Implement the entities, repos, DTOs and `NewsService` with the signatures above. Trim headline/body/caption; blank caption → null; set `createdAt`/`updatedAt` with `LocalDateTime.now()`; methods `@Transactional`.
- [ ] **Step 4:** Run `mvn -q test -Dtest=NewsServiceTest` → all pass.
- [ ] **Step 5:** Commit `Add news stories: entities, service and validation`.

### Task 2: Backend controller, security and upload limit

**Files:**
- Create: `backend/src/main/java/org/ngolibrary/web/NewsController.java`
- Modify: `backend/src/main/resources/application.yml` (add `spring.servlet.multipart.max-file-size: 3MB`, `max-request-size: 4MB`)
- Modify: `backend/pom.xml` (add `org.springframework.security:spring-security-test`, scope test)
- Test: `backend/src/test/java/org/ngolibrary/web/NewsControllerTest.java` (`@WebMvcTest(NewsController.class)`, `@Import(SecurityConfig.class)`, `@MockBean NewsService, AuthService, JwtService, AppUserDetailsService` as needed for `JwtAuthFilter` to load)

**Interfaces:**
- Consumes: `NewsService` (Task 1), `AuthService.current(Authentication)`.
- Produces the HTTP API exactly as the spec table:
  - `GET /api/news?page=0&size=10` → `Page<NewsStoryResponse>`
  - `GET /api/news/{id}` → `NewsStoryResponse`
  - `GET /api/news/{id}/photo` → `ResponseEntity<byte[]>` with `Content-Type` from the row and `Cache-Control: private, max-age=31536000`
  - `POST /api/news` multipart parts `story` (JSON, `consumes` `application/json` part) + optional `photo` → 201
  - `PUT /api/news/{id}` same parts → 200
  - `DELETE /api/news/{id}` → 204

- [ ] **Step 1: Write the failing tests:**
  - `studentCanList`: `@WithMockUser(roles = "STUDENT")` GET `/api/news` → 200.
  - `studentCannotCreate`: STUDENT multipart POST → 403; same for PUT and DELETE (`studentCannotUpdate`, `studentCannotDelete`).
  - `librarianCreates`: `roles = "LIBRARIAN"` multipart POST with `story` JSON part → 201, `NewsService.create` called.
  - `anonymousPhotoRefused`: no user, GET `/api/news/1/photo` → 401.
  - `photoHasCacheHeader`: STUDENT, service returns `NewsPhoto(image/jpeg, 3 bytes)` → 200, `Content-Type: image/jpeg`, `Cache-Control: private, max-age=31536000`.
- [ ] **Step 2:** `mvn -q test -Dtest=NewsControllerTest` → FAIL.
- [ ] **Step 3:** Implement `NewsController` following `BookCategoryController` (method-level `@PreAuthorize` on POST/PUT/DELETE), add the multipart limits and the test dependency.
- [ ] **Step 4:** `mvn -q test` → all pass; `mvn -q -DskipTests package` builds.
- [ ] **Step 5:** Commit `Add /api/news endpoints`.

### Task 3: App data layer and photo shrinking

**Files:**
- Modify: `android-app/src/app/core/models.ts` (add `NewsStory`, `NewsStoryRequest`)
- Modify: `android-app/src/app/core/api.service.ts`
- Create: `android-app/src/app/core/image-resize.ts`
- Test: `android-app/src/app/core/image-resize.spec.ts`

**Interfaces:**
- Produces:
  - `interface NewsStory { id: number; headline: string; body: string; eventDate: string; photoCaption?: string | null; hasPhoto: boolean; photoVersion: number; createdByName: string; createdAt: string; updatedAt: string; }`
  - `interface NewsStoryRequest { headline: string; body: string; eventDate: string; photoCaption?: string | null; removePhoto: boolean; }`
  - `ApiService.news(page: number, size = 10): Observable<Page<NewsStory>>`
  - `ApiService.saveStory(story: NewsStoryRequest, photo?: Blob | null, id?: number): Observable<NewsStory>` (FormData: `story` as `new Blob([JSON.stringify(story)], { type: 'application/json' })`, `photo` as `photo.jpg` when given; wrapped in `changes()`)
  - `ApiService.deleteStory(id: number): Observable<void>` (wrapped in `changes()`)
  - `ApiService.storyPhoto(id: number, version: number): Observable<Blob>` (`responseType: 'blob'`, URL `${base}/news/${id}/photo?v=${version}`)
  - `fitWithin(width: number, height: number, maxSide = 1280): { width: number; height: number }`, which never enlarges and rounds to whole pixels
  - `resizePhoto(file: Blob, maxSide = 1280, quality = 0.8): Promise<Blob>` (uses `createImageBitmap` + canvas `toBlob('image/jpeg', quality)`; rejects with `new Error(PHOTO_DECODE_ERROR)`)
  - `export const PHOTO_DECODE_ERROR = "This file isn't a photo the app can read."`

- [ ] **Step 1: Write the failing tests:**
  - `fitWithin(4000, 3000)` → `{ width: 1280, height: 960 }`; `fitWithin(3000, 4000)` → `{ width: 960, height: 1280 }`; `fitWithin(800, 600)` → `{ width: 800, height: 600 }`.
  - Review Focus 2: with `globalThis.createImageBitmap` stubbed via `vi.stubGlobal` to reject, `await expect(resizePhoto(new Blob(['%PDF']))).rejects.toThrow(PHOTO_DECODE_ERROR)`; also when `createImageBitmap` is undefined.
- [ ] **Step 2:** `npx ng test --watch=false --include src/app/core/image-resize.spec.ts` → FAIL.
- [ ] **Step 3:** Implement models, API methods and `image-resize.ts`.
- [ ] **Step 4:** Same command → pass; `npx ng build` succeeds.
- [ ] **Step 5:** Commit `App: news models, API and photo shrinking`.

### Task 4: Signed-in photo loader

**Files:**
- Create: `android-app/src/app/core/story-photo.directive.ts`
- Test: `android-app/src/app/core/story-photo.directive.spec.ts`

**Interfaces:**
- Consumes: `ApiService.storyPhoto(id, version)` (Task 3).
- Produces: standalone directive `StoryPhotoDirective`, selector `img[appStoryPhoto]`, inputs `appStoryPhoto: NewsStory` (required). Sets `src` to an object URL when the blob arrives; adds class `loaded` then; adds class `failed` on error (CSS shows the placeholder) and never leaves a broken `src`; revokes the previous object URL on input change and on destroy.

- [ ] **Step 1: Write the failing tests** (TestBed host component with `<img [appStoryPhoto]="story">`, `ApiService` stub):
  - `setsObjectUrlWhenLoaded`: stub returns `of(new Blob(['x'], { type: 'image/jpeg' }))`, `URL.createObjectURL` stubbed to `'blob:1'` → `img.src` ends with `blob:1`, has class `loaded`.
  - Review Focus 3, `marksFailedOnError`: stub returns `throwError(() => new HttpErrorResponse({ status: 404 }))` → class `failed`, `img.getAttribute('src')` is null.
  - `revokesOnDestroy`: destroy fixture → `URL.revokeObjectURL` called with `'blob:1'`.
- [ ] **Step 2:** Run with `--include src/app/core/story-photo.directive.spec.ts` → FAIL.
- [ ] **Step 3:** Implement the directive.
- [ ] **Step 4:** Same command → pass.
- [ ] **Step 5:** Commit `App: load story photos with the sign-in token`.

### Task 5: Staff editor (Config → News & events)

**Files:**
- Modify: `android-app/src/app/pages/config/config.page.html`, `config.page.ts` (new row under Book categories; count = `totalElements` of `api.news(0, 1)`, fetched in `ionViewWillEnter`, hidden until loaded)
- Create: `android-app/src/app/pages/config/news.page.ts|html|scss` (list)
- Create: `android-app/src/app/pages/config/news-form.modal.ts|html` (form)
- Modify: `android-app/src/app/tabs/tabs.routes.ts` (`config/news`, `...STAFF_ONLY`)
- Test: `android-app/src/app/pages/config/news-form.modal.spec.ts`

**Interfaces:**
- Consumes: `ApiService.news/saveStory/deleteStory` (Task 3), `resizePhoto` (Task 3), `StoryPhotoDirective` (Task 4), `PagedList` with `revisit()`, `UiService.confirm/toast/error`.
- Produces: `NewsFormModal` with `@Input() story?: NewsStory`; dismiss roles `'saved'` (data: `NewsStory`) and `'deleted'`.

- [ ] **Step 1: Write the failing tests** for `NewsFormModal` (ApiService stub, `ModalController` stub):
  - `requiresHeadlineBodyDate`: save with empty headline → `error()` is `"Add a headline, the story and its date."`, `saveStory` not called.
  - `newStoryDefaultsToToday`: `form.eventDate` equals today's `YYYY-MM-DD`.
  - `editWithoutPhotoChangeSendsNoFile`: open with a story that `hasPhoto`, save → `saveStory` called with `photo` null and `removePhoto` false.
  - `removePhotoSendsFlag`: call `removePhoto()` then save → `removePhoto` true.
  - `decodeErrorShown`: `choosePhoto` with a file whose `resizePhoto` rejects → `error()` equals `PHOTO_DECODE_ERROR`.
- [ ] **Step 2:** Run with `--include src/app/pages/config/news-form.modal.spec.ts` → FAIL.
- [ ] **Step 3:** Implement the form per spec section 2: fields Headline, Event date, Story (`.form-box.tall`, textarea `rows="6"`), Photo (hidden `<input type="file" accept="image/*">` triggered by a `.form-box` button labelled "Choose photo"; preview `<img>` with **Replace** / **Remove**), Caption (only with a photo), **Delete story** like `category-form.modal`. Then the list page (thumbnail via the directive, headline, date with `shortDate`, search filters loaded items by headline, + button, pull-to-refresh, `revisit()` on enter) and the Config row and route.
- [ ] **Step 4:** Tests pass; `npx ng lint` clean; `npx ng build` succeeds.
- [ ] **Step 5:** Commit `App: Config → News & events editor`.

### Task 6: Newspaper reader (News tab)

**Files:**
- Create: `android-app/src/assets/icons/tab-news.svg` (folded newspaper, 21×21 viewBox, stroke `#6F8B90`, width 1.575, round caps, like `tab-catalog.svg`)
- Create: `android-app/src/app/pages/news/news.page.ts|html|scss`, `story.modal.ts|html|scss`, `paragraphs.ts`
- Modify: `android-app/src/app/tabs/tabs.page.html` (News button after Catalog, all roles), `tabs.routes.ts` (`news`, no role guard)
- Test: `android-app/src/app/pages/news/news.page.spec.ts`, `paragraphs.spec.ts`

**Interfaces:**
- Consumes: `ApiService.news` (Task 3), `StoryPhotoDirective` (Task 4), `PagedList` (page size 10 via `(page, size) => api.news(page, size)`).
- Produces: `paragraphs(body: string): string[]` (split on one or more blank lines, trim, drop empties); `StoryModal` with `@Input({ required: true }) story: NewsStory`.

- [ ] **Step 1: Write the failing tests:**
  - `paragraphs("a\n\nb\n\n\n c ")` → `['a', 'b', 'c']`; `paragraphs("one\ntwo")` → `['one\ntwo']`.
  - `news.page`: with 3 stories → masthead text contains `राहुल सार्वजनिक वाचनालय`, `.lead` holds the first story's headline, `.story` count is 2.
  - `showsEmptyState`: 0 stories → text `No news yet — the librarian's stories will appear here.`
  - Review Focus 4, `showsErrorWhenServerFails`: `api.news` errors with status 0 → `.page-error` shows `Cannot reach the library server. Check your internet connection.` and no masthead skeleton remains.
- [ ] **Step 2:** Run with `--include 'src/app/pages/news/**/*.spec.ts'` → FAIL.
- [ ] **Step 3:** Implement per spec section 3. Paper tokens in `news.page.scss`/`story.modal.scss` as CSS custom properties on the page host with a `@media (prefers-color-scheme: dark)` override matching how `src/theme/variables.scss` switches themes; story text `text-align: justify; hyphens: auto; overflow-wrap: anywhere` (Review Focus 5); drop cap via `p:first-of-type::first-letter`; two columns at `min-width: 768px`; tap opens `StoryModal`.
- [ ] **Step 4:** Tests pass; lint clean; build succeeds.
- [ ] **Step 5: Browser check** (`android-app-mock` preview; add `/news` routes to the mock API first, in the scratchpad mock file only): at 320 px and 360 px, 7 staff tabs fit without clipped labels, a long unbroken word wraps, the lead photo and the placeholder both render in light and dark. Fix anything found.
- [ ] **Step 6:** Commit `App: newspaper News tab`.

### Task 7: Release

- [ ] **Step 1:** Whole-branch review (code-review pass) on both repos; fix findings; all tests green.
- [ ] **Step 2:** Ask the user before merging `backend` `news-newspaper` into `main` and pushing (Render redeploys). After it's live, check `GET /actuator/health` is 200 and `GET /api/news` returns 401 without a token.
- [ ] **Step 3:** App: `npx ng build`, `npx cap sync android`, `./gradlew assembleDebug`, upload `RahulLibrary-news-<date>-debug.apk` to Drive through Chrome, as before.
